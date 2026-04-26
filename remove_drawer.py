import re

with open('apps/web/src/app/(main)/profile/addresses/page.tsx', 'r') as f:
    content = f.read()

# Find and remove the delete confirm drawer section
pattern = r'\n\t\t\{/\* ── Delete confirm drawer ── \*/\}\n\t\t\{\(\(\) => \{.*?\}\)\(\)\}\n'
content = re.sub(pattern, '\n', content, flags=re.DOTALL)

with open('apps/web/src/app/(main)/profile/addresses/page.tsx', 'w') as f:
    f.write(content)

print("Drawer removed successfully")
