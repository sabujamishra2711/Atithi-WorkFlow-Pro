@echo off
echo Fixing Leave Balances...
cd /d "c:\Users\mrsbz\Downloads\MS Coders\Atithi WorkFlow Pro\Backend"
node src/scripts/fix-leave-balances.js --fix-all
pause