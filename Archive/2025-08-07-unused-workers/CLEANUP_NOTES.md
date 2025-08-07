# Cleanup Notes - August 7, 2025

## Archived Workers
The following workers have been archived as they are not currently in use:
- bitware_resource_manager
- bitware_ai_factory_optimizer
- bitware_content_classifier
- bitware_content_generator
- bitware_feed_fetcher
- bitware_report_builder
- bitware_rss_source_finder
- bitware_topic_researcher
- bitware_universal_researcher

## Active Workers (Kept)
- bitware_key_account_manager
- bitware_content_granulator
- Pages (Frontend)

## Databases to Delete (Not in use)
These databases belong to archived workers and can be deleted to save resources:

```bash
# Delete unused databases
wrangler d1 delete orchestrator-v2-db  # ID: 99a86f8e-35f8-42b7-b016-99c58f62531d
wrangler d1 delete universal-discovery-db  # ID: 691ef834-9e9e-4d5a-b278-2c8ef0f9ed66
wrangler d1 delete bitware-orchestration-db  # ID: a9c2f79e-682c-4faf-bf8a-d2f2800b97e5
wrangler d1 delete bitware-report-generation-db  # ID: 72e9e1b7-ed9b-4d65-9530-11ec28e7d3b0
wrangler d1 delete bitware-content-analysis-db  # ID: 752330ba-0eca-47f0-9416-ecee9419b685
wrangler d1 delete fetched-articles-db  # ID: 3dc8e03d-327a-4626-b50f-d611649a9582
wrangler d1 delete topic-research-db  # ID: cfe96e96-0c70-4918-9c7d-92d1b236e531
wrangler d1 delete RSS_SOURCES_DB  # ID: e1432d6e-2bf0-4322-a10d-dac7e2b37529
```

## Databases to Keep
- key-account-management-db (ID: 3a5628ac-deaf-4232-8a89-0535dd02796e) - Used by KAM
- content-granulator-db (ID: f8b4192a-0c00-4504-b758-feecd9f8015a) - Used by Content Granulator

## Architecture Change
Moving from multi-worker architecture to simplified architecture:
- Removing Resource Manager worker
- Implementing Cloudflare Queues directly in KAM
- KAM will handle all orchestration and queue management
- Direct communication between KAM and Content Granulator

## Benefits
1. Reduced worker count (saves costs)
2. Simpler architecture
3. No worker-to-worker communication overhead
4. Native queue infrastructure with Cloudflare Queues
5. Easier testing and debugging