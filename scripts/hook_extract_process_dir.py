import sys, re

cmd = sys.stdin.read()
match = re.search(r'--process-dir\s+["\']([^"\']*)["\']', cmd)
if match:
    print(match.group(1))
else:
    match = re.search(r'--process-dir\s+(\S+)', cmd)
    if match:
        print(match.group(1))
