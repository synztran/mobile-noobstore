# Read the file
with open('apps/web/src/app/(main)/profile/addresses/page.tsx', 'r') as f:
    lines = f.readlines()

# Find the starting line with the delete confirm drawer comment
start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if '/* ── Delete confirm drawer ── */' in line:
        start_idx = i
    if start_idx is not None and end_idx is None and '})()}' in line:
        # Found potential end, check if it's the right one
        # by looking at next line - should be blank or <AddressEditorDrawer
        if i + 1 < len(lines) and ('AddressEditorDrawer' in lines[i+1] or lines[i+1].strip() == ''):
            end_idx = i

if start_idx is not None and end_idx is not None:
    print(f"Removing lines {start_idx+1} to {end_idx+1}")
    # Remove the lines (keeping one newline before AddressEditorDrawer)
    new_lines = lines[:start_idx] + ['\n'] + lines[end_idx+1:]
    
    with open('apps/web/src/app/(main)/profile/addresses/page.tsx', 'w') as f:
        f.writelines(new_lines)
    print("Done!")
else:
    print(f"Could not find drawer section. start_idx={start_idx}, end_idx={end_idx}")
