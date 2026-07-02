import re

path = 'docs/keynote/level1-70-88-핵심설정-발표스크립트.md'
text = open(path, encoding='utf-8').read()

# Renumber every "S{n}" token (headings + cross-refs) for n=87..75 -> n+1.
# Descending order avoids collisions. Word-boundary on the number so S7 etc. untouched.
for n in range(87, 74, -1):
    text = re.sub(rf'S{n}\b', f'S{n+1}', text)

# Header / note counts.
text = text.replace('슬라이드 **69 ~ 87**', '슬라이드 **69 ~ 88**')
text = text.replace('전체 88면', '전체 89면')
text = text.replace('이 구간(S69~S88)', '이 구간(S69~S88)')  # already shifted

open(path, 'w', encoding='utf-8').write(text)
print("renumbered S75..S87 -> S76..S88")
# show resulting headings
for m in re.findall(r'^### S\d+\..*$', text, re.M):
    print(m[:70])
