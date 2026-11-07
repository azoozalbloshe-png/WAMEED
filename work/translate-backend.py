import ast,copy,json
from pathlib import Path
mapping=json.loads(Path('work/english-ui-map.json').read_text())
mapping.update(json.loads(Path('work/english-backend-map.json').read_text()))
paths=list(Path('backend/app/routers').glob('*.py'))+list(Path('backend/app/services').glob('*.py'))+[Path('backend/app')/p for p in ('permissions.py','security.py','mailer.py','phone_provider.py')]
for p in paths:
 source=p.read_bytes();lines=source.splitlines(keepends=True);starts=[0]
 for line in lines:starts.append(starts[-1]+len(line))
 edits=[]
 class Translate(ast.NodeTransformer):
  def visit_Constant(self,node):
   if isinstance(node.value,str) and node.value in mapping:node.value=mapping[node.value]
   return node
 class Collect(ast.NodeVisitor):
  def span(self,node):return starts[node.lineno-1]+node.col_offset,starts[node.end_lineno-1]+node.end_col_offset
  def visit_JoinedStr(self,node):
   new=Translate().visit(copy.deepcopy(node))
   if ast.dump(node)!=ast.dump(new):edits.append((*self.span(node),ast.unparse(new).encode()))
  def visit_Constant(self,node):
   if isinstance(node.value,str) and node.value in mapping and mapping[node.value]!=node.value:edits.append((*self.span(node),repr(mapping[node.value]).encode()))
 Collect().visit(ast.parse(source.decode()))
 for start,end,replacement in sorted(edits,reverse=True):source=source[:start]+replacement+source[end:]
 if edits:p.write_bytes(source)
print('Translated API messages, report headers, alerts and email subjects. Stored customer records were not changed.')
