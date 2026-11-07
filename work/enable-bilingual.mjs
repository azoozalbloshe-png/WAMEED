import ts from '../frontend/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';import path from 'node:path';
const forward={...JSON.parse(fs.readFileSync('work/english-ui-map.json','utf8')),...JSON.parse(fs.readFileSync('work/english-backend-map.json','utf8'))};
const ar={};for(const [original,english] of Object.entries(forward)){if(english!==original && !ar[english])ar[english]=original;}
Object.assign(ar,{'Dashboard':'لوحة التحكم','Properties':'العقارات','Properties & units':'العقارات والوحدات','Tenants':'المستأجرون','Contracts':'العقود','Settings':'الإعدادات','Reports':'التقارير','Maintenance':'الصيانة','Property':'عقار','Unit':'وحدة','Tenant':'مستأجر','Contract':'عقد','Meter':'عداد','Expense':'مصروف','Sign in':'تسجيل الدخول','Sign out':'تسجيل الخروج','Name':'الاسم','Floor':'الدور','View':'عرض','Loading':'جارٍ التحميل','Arabic':'العربية','English':'الإنجليزية','SAR':'ر.س','Language':'اللغة','Platform language:':'لغة المنصة:','Change language':'تغيير اللغة','Invalid credentials':'البريد أو اسم المستخدم أو كلمة المرور غير صحيحة','Email already registered':'البريد الإلكتروني مسجل مسبقًا','Username already taken':'اسم المستخدم مستخدم مسبقًا','Select language':'اختر اللغة','Your business at a glance':'عينك على أرقامك وأعمالك','Welcome,':'مرحبًا،','Today’s Wamdah':'ومضة اليوم',"Today's Wamdah":'ومضة اليوم','View Records':'عرض السجلات','View Report':'عرض التقرير','Record not found':'السجل غير موجود','Request failed':'تعذر إتمام الطلب','Open an alert to view its details.':'اضغط على التنبيه لفتح تفاصيله.'});
fs.writeFileSync('frontend/src/i18n/platform.ar.json',JSON.stringify(ar,null,2));
fs.mkdirSync('backend/app/locales',{recursive:true});fs.writeFileSync('backend/app/locales/ar.json',JSON.stringify(ar,null,2));
const keys=new Set(Object.keys(ar));const sourceAr=new Map(Object.entries(forward));
const has=s=>keys.has(s)||sourceAr.has(s);
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
let changed=0;
function scan(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory()){if(!['i18n','contexts'].includes(ent.name))scan(p);continue;}if(!p.endsWith('.tsx')||p.endsWith('/App.tsx'))continue;
 const source=fs.readFileSync(p,'utf8');const sf=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let usesRuntime=false,usesHook=false;const globalSearch=p.endsWith('/GlobalSearch.tsx');
 const trCall=e=>{usesRuntime=true;return ts.factory.createCallExpression(ts.factory.createIdentifier('tr'),undefined,[e]);};
 const protectedKey=new Set(['key','id','path','status','category','method','role','type','value','href','to','namePlaceholder','emailPlaceholder','usernamePlaceholder']);
 const result=ts.transform(sf,[ctx=>root=>{const f=ctx.factory;
 function walk(n){
  if(ts.isFunctionDeclaration(n)&&n.body){const body=ts.visitNode(n.body,walk);const name=n.name?.text||'';if(/^[A-Z]/.test(name)&&!name.endsWith('Provider')){usesHook=true;const stmt=f.createExpressionStatement(f.createCallExpression(f.createIdentifier('useUiLanguage'),undefined,[]));return f.updateFunctionDeclaration(n,n.modifiers,n.asteriskToken,n.name,n.typeParameters,n.parameters,n.type,f.updateBlock(body,[stmt,...body.statements]));}return f.updateFunctionDeclaration(n,n.modifiers,n.asteriskToken,n.name,n.typeParameters,n.parameters,n.type,body);}
  if(ts.isPropertyAssignment(n)&&ts.isStringLiteral(n.initializer)&&has(n.initializer.text)){
   const key=n.name.getText(sf).replace(/["']/g,'');
   if(!protectedKey.has(key)){usesRuntime=true;return f.createGetAccessorDeclaration(undefined,n.name,[],undefined,f.createBlock([f.createReturnStatement(trCall(f.createStringLiteral(n.initializer.text)))],true));}
  }
  if(ts.isJsxText(n)){const value=n.text.replace(/\s+/g,' ').trim();if(has(value))return f.createJsxExpression(undefined,trCall(f.createStringLiteral(value)));return n;}
  if(ts.isJsxAttribute(n)){
   const name=n.name.getText(sf);
   if(n.initializer&&ts.isStringLiteral(n.initializer)&&['aria-label','placeholder','title','alt'].includes(name)&&has(n.initializer.text))return f.updateJsxAttribute(n,n.name,f.createJsxExpression(undefined,trCall(f.createStringLiteral(n.initializer.text))));
   if(name==='dir'&&n.initializer&&ts.isStringLiteral(n.initializer)&&n.initializer.text==='ltr'){
    const tag=n.parent.parent.tagName.getText(sf);if(['div','section','main','article','form'].includes(tag)){usesRuntime=true;return f.updateJsxAttribute(n,n.name,f.createJsxExpression(undefined,f.createCallExpression(f.createIdentifier('direction'),undefined,[])));}
   }
   if(['className','value','type','pattern','name','id','href','to','key','lang','dir','inputMode','autoComplete','aria-controls','aria-labelledby','aria-describedby'].includes(name))return n;
  }
  if(ts.isStringLiteral(n)&&has(n.text)){
   const p=n.parent;
   if(ts.isJsxAttribute(p)||ts.isPropertyAssignment(p)||ts.isImportDeclaration(p)||ts.isCaseClause(p)||ts.isBinaryExpression(p)||ts.isLiteralTypeNode(p))return n;
   if(ts.isArrayLiteralExpression(p)){
    // Search result types are stable API keys; translate only the heading at render.
    if(globalSearch)return n;
    // Label arrays declared at module scope are translated at their render sites.
    let scope=p;while(scope&&!ts.isFunctionLike(scope))scope=scope.parent;
    if(!scope)return n;
   }
   // Property/index access keys must remain stable.
   if(ts.isElementAccessExpression(p)&&p.argumentExpression===n)return n;
   return trCall(f.createStringLiteral(n.text));
  }
  if(ts.isTemplateExpression(n)){
   const parts=[n.head.text,...n.templateSpans.map(x=>x.literal.text)];if(parts.some(has)){
    const expressions=[];if(parts[0])expressions.push(has(parts[0])?trCall(f.createStringLiteral(parts[0])):f.createStringLiteral(parts[0]));
    n.templateSpans.forEach((span,i)=>{expressions.push(ts.visitNode(span.expression,walk));if(parts[i+1])expressions.push(has(parts[i+1])?trCall(f.createStringLiteral(parts[i+1])):f.createStringLiteral(parts[i+1]));});
    return expressions.reduce((a,b)=>f.createBinaryExpression(a,ts.SyntaxKind.PlusToken,b),f.createStringLiteral(''));
   }
  }
  return ts.visitEachChild(n,walk,ctx);
 }
 return ts.visitNode(root,walk);}]);
 let out=printer.printFile(result.transformed[0]);result.dispose();
 // Logical layout utilities follow the selected language's direction.
 out=out.replace(/\b(text-left|text-right|left-\d+(?:\.\d+)?|right-\d+(?:\.\d+)?|ml-\d+(?:\.\d+)?|mr-\d+(?:\.\d+)?|pl-\d+(?:\.\d+)?|pr-\d+(?:\.\d+)?|border-l-\d+|border-r-\d+)\b/g,t=>t.replace(/text-left|text-right|left|right|ml|mr|pl|pr|border-l|border-r/g,x=>({'text-left':'text-start','text-right':'text-end',left:'start',right:'end',ml:'ms',mr:'me',pl:'ps',pr:'pe','border-l':'border-s','border-r':'border-e'})[x]));
 const rel=path.relative(path.dirname(p),'frontend/src/i18n/runtime').replaceAll('\\','/');const ctxrel=path.relative(path.dirname(p),'frontend/src/contexts/LanguageContext').replaceAll('\\','/');
 if(usesRuntime)out=`import {tr, direction} from '${rel.startsWith('.')?rel:'./'+rel}';\n`+out;
 if(usesHook)out=`import {useLanguage as useUiLanguage} from '${ctxrel.startsWith('.')?ctxrel:'./'+ctxrel}';\n`+out;
 // Only import direction when used.
 out=out.replace('{tr, direction}',out.includes('direction()')?'{tr, direction}':'{tr}');
 if(out!==source){fs.writeFileSync(p,out);changed++;}
}}
scan('frontend/src');console.log('Localized component files:',changed);
