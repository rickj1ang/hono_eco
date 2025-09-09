#!/usr/bin/env node

const baseUrl = 'http://localhost:8787'

async function testAPI() {
  console.log('🧪 Testing Economic Calendar API...\n')

  // Test 1: Root endpoint
  console.log('1. Testing root endpoint...')
  try {
    const response = await fetch(`${baseUrl}/`)
    const data = await response.json()
    console.log('✅ Root endpoint:', data.message)
  } catch (error) {
    console.log('❌ Root endpoint failed:', error.message)
  }

  // Test 2: Health check
  console.log('\n2. Testing health check...')
  try {
    const response = await fetch(`${baseUrl}/health`)
    const data = await response.json()
    console.log('✅ Health check:', data.status, data.timestamp)
  } catch (error) {
    console.log('❌ Health check failed:', error.message)
  }

  // Test 3: Missing parameters
  console.log('\n3. Testing missing parameters...')
  try {
    const response = await fetch(`${baseUrl}/economic-calendar`)
    const data = await response.json()
    console.log('✅ Missing parameters error:', data.error)
  } catch (error) {
    console.log('❌ Missing parameters test failed:', error.message)
  }

  // Test 4: Invalid date format
  console.log('\n4. Testing invalid date format...')
  try {
    const response = await fetch(`${baseUrl}/economic-calendar?from_date=invalid&to_date=invalid`)
    const data = await response.json()
    console.log('✅ Invalid date format error:', data.error)
  } catch (error) {
    console.log('❌ Invalid date format test failed:', error.message)
  }

  // Test 5: Valid request (might return 0 events)
  console.log('\n5. Testing valid request...')
  try {
    const response = await fetch(`${baseUrl}/economic-calendar?from_date=01/12/2024&to_date=31/12/2024`)
    const data = await response.json()
    console.log('✅ Valid request:', {
      success: data.success,
      count: data.count,
      from_date: data.from_date,
      to_date: data.to_date,
      country: data.country
    })
  } catch (error) {
    console.log('❌ Valid request failed:', error.message)
  }

  console.log('\n🎉 API testing completed!')
}

testAPI().catch(console.error)
