#!/usr/bin/env node

// Test script to verify itinerary generation with real API data
const { generatePersonalizedItinerary } = require('../src/ai/flows/generate-personalized-itinerary');

async function testItinerary() {
    console.log('🧪 Testing itinerary generation with real API data...\n');
    
    const testPrompt = 'I want to visit Paris for 3 days from January 15-17, 2025. I\'m traveling from London with my partner.';
    
    console.log('📝 Test prompt:', testPrompt);
    console.log('⏰ Starting generation...\n');
    
    try {
        const result = await generatePersonalizedItinerary({
            prompt: testPrompt
        });
        
        console.log('\n✅ Generation successful!');
        console.log('📍 Destination:', result.destination);
        console.log('📋 Title:', result.title);
        console.log('📅 Days:', result.itinerary.length);
        
        // Check if dates are correct
        console.log('\n📆 Date validation:');
        result.itinerary.forEach(day => {
            console.log(`  Day ${day.day}: ${day.date} - ${day.title}`);
            const year = new Date(day.date).getFullYear();
            if (year !== 2025) {
                console.error(`  ❌ Wrong year! Got ${year} instead of 2025`);
            }
        });
        
        // Check if activities have real addresses
        console.log('\n🏢 Checking for real API data:');
        let realDataCount = 0;
        let totalActivities = 0;
        
        result.itinerary.forEach(day => {
            day.activities.forEach(activity => {
                totalActivities++;
                if (activity.address && activity.address !== 'N/A' && activity.address !== 'Address not available') {
                    realDataCount++;
                    console.log(`  ✅ ${activity.description} - ${activity.address}`);
                } else {
                    console.log(`  ⚠️ ${activity.description} - No real address`);
                }
            });
        });
        
        console.log(`\n📊 Real data ratio: ${realDataCount}/${totalActivities} activities have real addresses`);
        
        if (realDataCount === 0) {
            console.error('\n❌ WARNING: No activities have real addresses from APIs!');
        }
        
    } catch (error) {
        console.error('\n❌ Generation failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run if called directly
if (require.main === module) {
    testItinerary().then(() => {
        console.log('\n🏁 Test complete');
        process.exit(0);
    }).catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}