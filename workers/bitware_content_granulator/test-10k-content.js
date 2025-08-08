// Test script for creating a 10,000-word content structure
// This will create a compact course optimized for content generation

// const API_URL = 'http://localhost:8787'; // Use production URL if needed
const API_URL = 'https://bitware-content-granulator.jhaladik.workers.dev';

async function test10KWordStructure() {
  console.log('🚀 Testing Content Granulator for 10,000-word content generation\n');
  console.log('Target: Create a course structure optimized for ~10,000 words total\n');

  // Calculate optimal structure for 10,000 words:
  // - 3 modules (3,300 words each)
  // - 3 lessons per module (1,000 words each)
  // - Module intro: 300 words
  // - Lesson content: 800 words
  // - Examples: 200 words per lesson
  // Total: ~10,000 words

  const request = {
    topic: "Python Web Development Fundamentals",
    structureType: "course",
    templateName: "educational_course_basic",
    granularityLevel: 2, // Reduced granularity for more focused content
    targetAudience: "Junior developers learning web development",
    constraints: {
      maxElements: 12, // 3 modules × 3 lessons + 3 module elements
      targetWordCount: 10000,
      focusAreas: [
        "Flask basics",
        "REST API development", 
        "Database integration"
      ]
    },
    options: {
      includeExamples: true,
      includePracticalExercises: true,
      detailLevel: "intermediate",
      contentDensity: "balanced"
    },
    validation: {
      enabled: false // Skip validation for faster testing
    }
  };

  try {
    console.log('📤 Sending granulation request...\n');
    console.log('Request parameters:', JSON.stringify(request, null, 2), '\n');

    const response = await fetch(`${API_URL}/api/granulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-key-123' // Replace with valid API key
      },
      body: JSON.stringify(request)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', result.error || 'Request failed');
      return;
    }

    console.log('✅ Granulation successful!\n');
    console.log('Job ID:', result.jobId);
    console.log('Processing Time:', result.processingTimeMs, 'ms');
    console.log('Quality Score:', result.qualityScore);
    console.log('Cost:', '$' + result.costUsd.toFixed(4), '\n');

    // Display summary
    console.log('📊 Structure Summary:');
    console.log('Total Elements:', result.summary.totalElements);
    console.log('Modules:', result.summary.modules);
    console.log('Lessons:', result.summary.lessons);
    console.log('Assessments:', result.summary.assessments);
    console.log('Exercises:', result.summary.exercises, '\n');

    // Display word count estimates
    if (result.summary.wordCountEstimates) {
      console.log('📝 Word Count Estimates:');
      console.log('Total Words:', result.summary.wordCountEstimates.total);
      console.log('\nBy Section:');
      Object.entries(result.summary.wordCountEstimates.bySection || {}).forEach(([section, count]) => {
        console.log(`  ${section}: ${count} words`);
      });
      console.log('\nBy Priority:');
      Object.entries(result.summary.wordCountEstimates.byPriority || {}).forEach(([priority, count]) => {
        console.log(`  ${priority}: ${count} words`);
      });
    }

    // Display content metadata
    if (result.summary.contentMetadata) {
      console.log('\n🎯 Content Generation Metadata:');
      const metadata = result.summary.contentMetadata;
      
      console.log('\nGeneration Strategy:');
      console.log('  Approach:', metadata.generationStrategy?.approach);
      console.log('  Parallelizable:', metadata.generationStrategy?.parallelizable);
      console.log('  Dependencies:', metadata.generationStrategy?.dependencies?.length || 0);
      
      console.log('\nContent Types:', metadata.contentTypes?.join(', '));
      
      console.log('\nTone Guidelines:');
      console.log('  Primary:', metadata.toneGuidelines?.primary);
      console.log('  Variations:', metadata.toneGuidelines?.variations?.join(', '));
      
      console.log('\nQuality Targets:');
      Object.entries(metadata.qualityTargets || {}).forEach(([metric, value]) => {
        console.log(`  ${metric}: ${value}`);
      });
      
      console.log('\nEstimated Generation Time:');
      console.log('  Sequential:', metadata.estimatedGenerationTime?.sequential, 'seconds');
      console.log('  Parallel:', metadata.estimatedGenerationTime?.parallel, 'seconds');
    }

    // Display course structure
    console.log('\n📚 Course Structure:');
    if (result.structure?.courseOverview) {
      console.log('\nCourse: ' + result.structure.courseOverview.title);
      console.log('Duration: ' + result.structure.courseOverview.duration);
      console.log('Target Audience: ' + result.structure.courseOverview.targetAudience);
    }

    if (result.structure?.modules) {
      console.log('\nModules:');
      result.structure.modules.forEach((module, idx) => {
        console.log(`\n${idx + 1}. ${module.title}`);
        console.log(`   Duration: ${module.estimatedDuration}`);
        console.log(`   Lessons: ${module.lessons?.length || 0}`);
        
        if (module.lessons) {
          module.lessons.forEach((lesson, lidx) => {
            console.log(`     ${idx + 1}.${lidx + 1} ${lesson.title}`);
            
            // Calculate estimated words for this lesson
            const lessonWords = 800; // Base content
            const exampleWords = 200; // Examples
            const exerciseWords = (lesson.practicalExercises?.length || 0) * 50;
            const totalLessonWords = lessonWords + exampleWords + exerciseWords;
            
            console.log(`         Estimated words: ${totalLessonWords}`);
            console.log(`         Exercises: ${lesson.practicalExercises?.length || 0}`);
          });
        }
        
        if (module.assessment) {
          console.log(`   Assessment: ${module.assessment.type} (${module.assessment.weight})`);
        }
      });
    }

    // Save the structure for content generation
    const fs = require('fs').promises;
    const outputFile = `granulation-output-${result.jobId}.json`;
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full output saved to: ${outputFile}`);

    // Verify word count alignment
    console.log('\n✅ Word Count Verification:');
    const estimatedTotal = result.summary.wordCountEstimates?.total || 0;
    const targetWords = 10000;
    const variance = Math.abs(estimatedTotal - targetWords);
    const variancePercent = (variance / targetWords * 100).toFixed(1);
    
    console.log(`Target: ${targetWords} words`);
    console.log(`Estimated: ${estimatedTotal} words`);
    console.log(`Variance: ${variance} words (${variancePercent}%)`);
    
    if (variancePercent <= 20) {
      console.log('✅ Structure is well-optimized for target word count!');
    } else {
      console.log('⚠️ Structure may need adjustment for optimal word count');
    }

    return result;

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  test10KWordStructure().then(() => {
    console.log('\n✅ Test complete!');
  }).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { test10KWordStructure };