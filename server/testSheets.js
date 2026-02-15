/**
 * Test script to verify DSA Sheets in MongoDB
 * Run: node server/testSheets.js
 */

import mongoose from 'mongoose';
import Sheet from './models/Sheet.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepwiser';

async function testSheets() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB\n');

    // Get all sheets
    const sheets = await Sheet.find({}).select('-sections');
    
    console.log(`Found ${sheets.length} sheets in database:\n`);
    
    sheets.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.title}`);
      console.log(`   Slug: ${sheet.slug}`);
      console.log(`   Type: ${sheet.type}`);
      console.log(`   Total Problems: ${sheet.totalProblems}`);
      console.log(`   Description: ${sheet.description.substring(0, 100)}...`);
      console.log('');
    });

    if (sheets.length === 0) {
      console.log('⚠️  No sheets found! Run the seeder: node server/seeders/seedSheets.js');
    } else {
      console.log('✓ All sheets are available in the database');
      
      // Test fetching one sheet with full details
      console.log('\nTesting full sheet data for:', sheets[0].slug);
      const fullSheet = await Sheet.findOne({ slug: sheets[0].slug });
      console.log(`✓ Sheet has ${fullSheet.sections.length} sections`);
      const totalProblems = fullSheet.sections.reduce((sum, s) => sum + s.problems.length, 0);
      console.log(`✓ Total problems in sections: ${totalProblems}`);
    }

    await mongoose.connection.close();
    console.log('\n✓ Test completed successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSheets();
