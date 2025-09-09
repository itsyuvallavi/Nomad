#!/bin/bash

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Run the test
npx tsx tests/test-multi-transport.ts