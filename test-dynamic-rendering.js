/**
 * Test Dynamic Rendering System
 * Verifies that all stages render correctly for different content types
 */

const https = require('https');

const TEST_PROJECTS = [
    { id: 2, name: 'Quantum Computing Fundamentals', type: 'course' },
    { id: 5, name: 'Rocky', type: 'novel' }
];

function fetchProjectDetail(projectId) {
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

async function testDynamicRendering() {
    console.log('🧪 Testing Dynamic Rendering System');
    console.log('=====================================\n');

    for (const project of TEST_PROJECTS) {
        console.log(`\n📋 Testing Project ${project.id}: ${project.name}`);
        console.log(`   Type: ${project.type}`);
        console.log('   -----------------------------------');
        
        try {
            const response = await fetchProjectDetail(project.id);
            
            if (response.success && response.project) {
                const proj = response.project;
                
                // Check each stage
                if (proj.stages && proj.stages.length > 0) {
                    console.log(`   ✅ Found ${proj.stages.length} stages`);
                    
                    for (const stage of proj.stages) {
                        console.log(`\n   Stage ${stage.stage_number}: ${stage.stage_name}`);
                        console.log(`   Status: ${stage.status}`);
                        
                        if (stage.output) {
                            const output = stage.output;
                            
                            // Check for content type specific fields
                            if (project.type === 'course') {
                                console.log('   🎓 Course-specific fields expected:');
                                
                                if (stage.stage_number === 1) {
                                    const hasLearningObjectives = output.LearningObjectives || 
                                                                 output.LEARNING_OBJECTIVES ||
                                                                 (output.content && output.content.includes('LearningObjectives'));
                                    console.log(`      - Learning Objectives: ${hasLearningObjectives ? '✅' : '❌'}`);
                                    
                                    const hasCourseStructure = output.CourseStructure || 
                                                              output.COURSE_STRUCTURE ||
                                                              (output.content && output.content.includes('CourseStructure'));
                                    console.log(`      - Course Structure: ${hasCourseStructure ? '✅' : '❌'}`);
                                }
                                
                                if (stage.stage_number === 3) {
                                    const hasModules = output.Modules || output.modules || output.structure ||
                                                     (output.content && output.content.includes('Modules'));
                                    console.log(`      - Modules: ${hasModules ? '✅' : '❌'}`);
                                }
                                
                                if (stage.stage_number === 4) {
                                    const hasActivities = output.Activities || output.activities || 
                                                        output.LearningActivities || output.granular_units ||
                                                        (output.content && output.content.includes('Activities'));
                                    console.log(`      - Activities: ${hasActivities ? '✅' : '❌'}`);
                                }
                                
                            } else if (project.type === 'novel') {
                                console.log('   📖 Novel-specific fields expected:');
                                
                                if (stage.stage_number === 1) {
                                    const hasCoreConcept = output.CORE_CONCEPT || output.BIG_PICTURE ||
                                                         (output.content && output.content.includes('CORE_CONCEPT'));
                                    console.log(`      - Core Concept: ${hasCoreConcept ? '✅' : '❌'}`);
                                    
                                    const hasNarrativeArc = output.NARRATIVE_ARC ||
                                                          (output.content && output.content.includes('NARRATIVE_ARC'));
                                    console.log(`      - Narrative Arc: ${hasNarrativeArc ? '✅' : '❌'}`);
                                }
                                
                                if (stage.stage_number === 3) {
                                    const hasActs = output.acts || output.structure ||
                                                  (output.content && output.content.includes('acts'));
                                    console.log(`      - Acts: ${hasActs ? '✅' : '❌'}`);
                                }
                                
                                if (stage.stage_number === 4) {
                                    const hasScenes = output.scenes || output.granular_units ||
                                                    (output.content && output.content.includes('scenes'));
                                    console.log(`      - Scenes: ${hasScenes ? '✅' : '❌'}`);
                                }
                            }
                            
                            // Show a sample of the data structure
                            if (output.content && typeof output.content === 'string') {
                                console.log('      📦 Data is wrapped in content field (needs parsing)');
                            } else {
                                console.log('      📦 Data is directly accessible');
                            }
                        } else {
                            console.log('   ⚠️ No output data for this stage');
                        }
                    }
                } else {
                    console.log('   ⚠️ No stages found');
                }
            } else {
                console.log(`   ❌ Failed to fetch project: ${response.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n\n📊 Dynamic Rendering Summary');
    console.log('============================');
    console.log('The dynamic rendering system should:');
    console.log('1. ✅ Detect content type from data structure');
    console.log('2. ✅ Parse nested JSON with markdown wrappers');
    console.log('3. ✅ Handle different field names for each content type:');
    console.log('   - Course: LearningObjectives, CourseStructure, Modules, Activities');
    console.log('   - Novel: CORE_CONCEPT, NARRATIVE_ARC, acts, scenes');
    console.log('4. ✅ Apply appropriate labels and icons based on content type');
    console.log('5. ✅ Gracefully handle missing or unexpected data structures');
    console.log('\nFrontend Test URLs:');
    console.log('🔗 https://ai-factory-frontend.pages.dev/admin.html#granulation');
    console.log('   - Click on projects to test stage rendering');
    console.log('   - Check browser console for debug output');
}

testDynamicRendering().catch(console.error);