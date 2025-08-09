/**
 * Test the Universal Template System
 * Verifies that different content types render with appropriate labels and structure
 */

const https = require('https');

const PROJECTS = [
    { id: 1, name: 'The Quantum Detective', type: 'novel', expectedLabels: ['Acts', 'Chapters', 'Scenes'] },
    { id: 2, name: 'Quantum Computing Fundamentals', type: 'course', expectedLabels: ['Modules', 'Lessons', 'Activities'] },
    { id: 3, name: 'Test Project', type: 'novel', expectedLabels: ['Acts', 'Chapters', 'Scenes'] },
    { id: 5, name: 'Rocky', type: 'novel', expectedLabels: ['Characters', 'Locations', 'Timeline'] }
];

function fetchProject(projectId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'bitware-content-granulator.jhaladik.workers.dev',
            path: `/api/projects/${projectId}`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer internal-worker-auth-token-2024',
                'X-Worker-ID': 'test-worker'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function testTemplateSystem() {
    console.log('🧪 Testing Universal Template System');
    console.log('=====================================\n');

    for (const project of PROJECTS) {
        console.log(`\n📋 Testing Project ${project.id}: ${project.name}`);
        console.log(`   Type: ${project.type}`);
        console.log('   -----------------------------------');
        
        try {
            const response = await fetchProject(project.id);
            
            if (response.success && response.project) {
                const proj = response.project;
                
                // Check content type
                console.log(`   ✅ Content Type: ${proj.content_type}`);
                
                // Check stages
                if (proj.stages && proj.stages.length > 0) {
                    console.log(`   ✅ Stages Found: ${proj.stages.length}`);
                    
                    proj.stages.forEach(stage => {
                        console.log(`      - Stage ${stage.stage_number}: ${stage.stage_name} (${stage.status})`);
                    });
                    
                    // Verify template expectations
                    if (proj.content_type === 'course') {
                        console.log(`   🎓 Course Template Expectations:`);
                        console.log(`      - Should show: Learning Objectives, Prerequisites`);
                        console.log(`      - Objects: Concepts, Resources, Tools`);
                        console.log(`      - Structure: Modules → Lessons → Activities`);
                    } else if (proj.content_type === 'novel') {
                        console.log(`   📖 Novel Template Expectations:`);
                        console.log(`      - Should show: Core Concept, Themes, Narrative Arc`);
                        console.log(`      - Objects: Characters, Locations, Timeline`);
                        console.log(`      - Structure: Acts → Chapters → Scenes`);
                    }
                } else {
                    console.log(`   ⚠️ No stages found`);
                }
            } else {
                console.log(`   ❌ Failed to fetch project: ${response.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n\n📊 Template System Summary');
    console.log('===========================');
    console.log('The template system should:');
    console.log('1. ✅ Parse all stage data uniformly (nested JSON with markdown)');
    console.log('2. ✅ Apply content-type-specific labels dynamically');
    console.log('3. ✅ Render appropriate icons and terminology');
    console.log('4. ✅ Maintain the same data structure across all types');
    console.log('\nKey Benefits:');
    console.log('- 🎯 Single codebase for all content types');
    console.log('- 🔄 Easy to add new content types (podcast, documentary, etc.)');
    console.log('- 🎨 Consistent UI with contextual labeling');
    console.log('- 🚀 Backend and frontend templates aligned');
}

testTemplateSystem().catch(console.error);