import ts from '../frontend/node_modules/typescript/lib/typescript.js';import fs from 'node:fs';import path from 'node:path';
const catalog=JSON.parse(fs.readFileSync('frontend/src/i18n/platform.ar.json','utf8'));const printer=ts.createPrinter();
function scan(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);if(ent.isDirectory()){if(!['i18n','contexts'].includes(ent.name))scan(file);continue;}if(!file.endsWith('.tsx')||file.endsWith('/App.tsx')||file.endsWith('/LanguageButton.tsx'))continue;
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let touched=false;
 const result=ts.transform(sf,[ctx=>root=>{const f=ctx.factory;const call=e=>f.createCallExpression(f.createIdentifier('tr'),undefined,[e]);function walk(n){
  if(ts.isJsxAttribute(n)&&n.initializer&&ts.isStringLiteral(n.initializer)&&['description','message','label'].includes(n.name.getText(sf))&&catalog[n.initializer.text]){touched=true;return f.updateJsxAttribute(n,n.name,f.createJsxExpression(undefined,call(f.createStringLiteral(n.initializer.text))));}
  if(ts.isJsxExpression(n)&&n.expression&&!ts.isJsxAttribute(n.parent)&&ts.isIdentifier(n.expression)&&['error','message','failure'].includes(n.expression.text)){touched=true;return f.updateJsxExpression(n,call(n.expression));}
  if(ts.isJsxElement(n)&&n.children.every(c=>ts.isJsxText(c)&&!c.text.trim()||ts.isJsxExpression(c)&&!c.expression)){
   const tag=n.openingElement.tagName.getText(sf);let expression;
   if(file.endsWith('/Analytics.tsx'))expression='data.basis';
   else if(file.endsWith('/NotificationCenter.tsx')){expression=tag==='h3'?'a.title':n.openingElement.getText(sf).includes('mt-1')?'a.description':'data.basis';}
   else if(file.endsWith('/ReportCenter.tsx'))expression=tag==='h2'?'data.title':tag==='th'?'c.label':'data.basis';
   else if(file.endsWith('/Login.tsx')||file.endsWith('/Properties.tsx')||file.endsWith('/MeterCalculation.tsx'))expression='error';
   else if(file.endsWith('/ForgotPassword.tsx'))expression=n.openingElement.getText(sf).includes('role="alert"')?'error':'message';
   else if(['/Verification.tsx','/Developer.tsx','/ResetPassword.tsx'].some(p=>file.endsWith(p)))expression='message';
   if(expression){touched=true;let expr=expression.split('.').reduce((a,b)=>a?f.createPropertyAccessExpression(a,b):f.createIdentifier(b),undefined);return f.updateJsxElement(n,n.openingElement,[f.createJsxExpression(undefined,call(expr))],n.closingElement);}
  }
  return ts.visitEachChild(n,walk,ctx);
 }return ts.visitNode(root,walk)}]);
 if(touched)fs.writeFileSync(file,printer.printFile(result.transformed[0]));result.dispose();
}}
scan('frontend/src');
