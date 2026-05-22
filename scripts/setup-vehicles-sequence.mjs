/**
 * Setup auto-increment sequence for vehicles table
 */

import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = new Pool({ connectionString: DATABASE_URL });

async function setupSequence() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up vehicles table sequence...\n');
    
    // Check if sequence exists
    const seqCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_sequences 
        WHERE schemaname = 'public' 
        AND sequencename = 'vehicles_id_seq'
      )
    `);
    
    const sequenceExists = seqCheck.rows[0].exists;
    console.log(`Sequence 'vehicles_id_seq': ${sequenceExists ? 'EXISTS ✓' : 'NOT FOUND'}`);
    
    if (!sequenceExists) {
      // Get max id from vehicles table
      const maxIdResult = await client.query('SELECT MAX(id) as max_id FROM vehicles');
      const maxId = maxIdResult.rows[0].max_id || 0;
      const startValue = maxId + 1;
      
      console.log(`Max existing ID: ${maxId}`);
      console.log(`Creating sequence starting from: ${startValue}`);
      
      // Create sequence
      await client.query(`
        CREATE SEQUENCE vehicles_id_seq
        START WITH ${startValue}
        INCREMENT BY 1
        NO MAXVALUE
        CACHE 1
      `);
      console.log('✅ Sequence created');
    }
    
    // Check if column has default value
    const colCheck = await client.query(`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'id'
    `);
    
    const hasDefault = colCheck.rows[0]?.column_default?.includes('nextval');
    console.log(`\nColumn 'id' has auto-increment: ${hasDefault ? 'YES ✓' : 'NO'}`);
    
    if (!hasDefault) {
      console.log('Setting default value for id column...');
      await client.query(`
        ALTER TABLE vehicles 
        ALTER COLUMN id 
        SET DEFAULT nextval('vehicles_id_seq')
      `);
      console.log('✅ Auto-increment set for id column');
    }
    
    // Set sequence ownership
    await client.query(`
      ALTER SEQUENCE vehicles_id_seq 
      OWNED BY vehicles.id
    `);
    console.log('✅ Sequence ownership set');
    
    // Test the sequence
    console.log('\n🧪 Testing sequence...');
    const testResult = await client.query("SELECT nextval('vehicles_id_seq') as next_id");
    const nextId = testResult.rows[0].next_id;
    console.log(`Next ID from sequence: ${nextId}`);
    
    // Reset sequence to correct position
    const maxIdResult = await client.query('SELECT MAX(id) as max_id FROM vehicles');
    const maxId = maxIdResult.rows[0].max_id || 0;
    await client.query(`SELECT setval('vehicles_id_seq', ${maxId}, true)`);
    console.log(`✅ Sequence reset to max ID: ${maxId}`);
    
    console.log('\n🎉 Sequence setup complete!');
    console.log('You can now:');
    console.log('  • Add new vehicles (ID will auto-increment)');
    console.log('  • Edit existing vehicles');
    console.log('  • Update vehicle details');
    console.log('  • Delete vehicles');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

setupSequence();
