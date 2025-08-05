#!/bin/bash
cd workers/bitware_content_granulator
echo "Starting wrangler tail... Run test-granulator-now.sh in another terminal!"
wrangler tail bitware-content-granulator --format pretty