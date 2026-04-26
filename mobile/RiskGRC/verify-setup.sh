#!/bin/bash

# RiskGRC Setup Verification Script
# This script verifies that all dependencies and configurations are properly set up

set -e

echo "🔍 RiskGRC Setup Verification"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for checks
PASSED=0
FAILED=0

# Helper functions
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((FAILED++))
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2 (Missing: $1)"
        ((FAILED++))
    fi
}

check_env() {
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} $1 (Not found, using defaults)"
    fi
}

# Check system requirements
echo "📋 System Requirements:"
check_command "node" "Node.js installed"
check_command "npm" "npm installed"

# Get versions
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "  Node version: $NODE_VERSION"
echo "  npm version: $NPM_VERSION"
echo ""

# Check Node version
MIN_NODE_VERSION="22.11.0"
if [[ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -ge 22 ]]; then
    echo -e "${GREEN}✓${NC} Node version >= 22.11.0"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Node version must be >= 22.11.0"
    ((FAILED++))
fi
echo ""

# Check project files
echo "📂 Project Files:"
check_file "package.json" "package.json exists"
check_file "app.json" "app.json exists"
check_file "index.js" "index.js exists (Expo entry point)"
check_file "App.tsx" "App.tsx exists"
check_file "babel.config.js" "babel.config.js exists"
check_file "metro.config.js" "metro.config.js exists"
check_file ".gitignore" ".gitignore exists"
check_file "README.md" "README.md exists"
check_file "SECURITY.md" "SECURITY.md exists"
echo ""

# Check dependencies
echo "📦 Dependencies:"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules directory exists"
    ((PASSED++))
    
    # Check critical packages
    check_command "expo" "Expo CLI available"
    check_command "npx" "npx available"
    
    if [ -f "node_modules/expo/package.json" ]; then
        echo -e "${GREEN}✓${NC} Expo package installed"
        ((PASSED++))
    fi
else
    echo -e "${RED}✗${NC} node_modules not found - Run: npm install"
    ((FAILED++))
fi
echo ""

# Check configuration files
echo "⚙️  Configuration:"
check_env ".env file configured"
check_file ".env.example" ".env.example template exists"
echo ""

# Check source directories
echo "📁 Source Structure:"
[ -d "src/screens" ] && echo -e "${GREEN}✓${NC} src/screens directory exists" && ((PASSED++)) || (echo -e "${RED}✗${NC} src/screens missing" && ((FAILED++)))
[ -d "src/services" ] && echo -e "${GREEN}✓${NC} src/services directory exists" && ((PASSED++)) || (echo -e "${RED}✗${NC} src/services missing" && ((FAILED++)))
[ -d "src/utils" ] && echo -e "${GREEN}✓${NC} src/utils directory exists" && ((PASSED++)) || (echo -e "${RED}✗${NC} src/utils missing" && ((FAILED++)))
[ -d "src/constants" ] && echo -e "${GREEN}✓${NC} src/constants directory exists" && ((PASSED++)) || (echo -e "${RED}✗${NC} src/constants missing" && ((FAILED++)))
echo ""

# Check screen files
echo "🎨 Screen Components:"
check_file "src/screens/LoginScreen.js" "LoginScreen.js"
check_file "src/screens/RegisterScreen.js" "RegisterScreen.js"
check_file "src/screens/DashboardScreen.js" "DashboardScreen.js"
check_file "src/screens/NewAssessmentScreen.js" "NewAssessmentScreen.js"
check_file "src/screens/AssessmentDetailScreen.js" "AssessmentDetailScreen.js"
echo ""

# Check utility files
echo "🔧 Utility Files:"
check_file "src/services/api.js" "API service"
check_file "src/utils/validation.js" "Validation utilities"
check_file "src/constants/config.js" "Configuration constants"
echo ""

# Summary
echo "=============================="
echo "📊 Verification Results:"
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Configure .env if needed (copy from .env.example)"
    echo "  2. Start the development server:"
    echo "     $ npx expo start --web"
    echo "  3. Open your browser to the provided URL (usually http://localhost:19006)"
    echo ""
    echo "For more information, see README.md"
    exit 0
else
    echo -e "${RED}✗ Setup verification failed!${NC}"
    echo ""
    echo "Please fix the issues above and run this script again."
    echo "For help, see README.md or SECURITY.md"
    exit 1
fi
