import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url), output=new URL('.review.local/',root);
await mkdir(output,{recursive:true});
for (const [name,shared] of [['telegram-reminders','telegramReminders'],['telegram-account','telegramSetup']]) {
  const common=await readFile(new URL(`supabase/functions/_shared/${shared}.ts`,root),'utf8');
  const main=await readFile(new URL(`supabase/functions/${name}/index.ts`,root),'utf8');
  const single=main.replace(/^import .*from "\.\.\/_shared\/.*";\r?\n/m,'');
  await writeFile(new URL(`${name}.ts`,output),common+'\n'+single);
}
// Source code only. Generated files never contain tokens or financial records.
console.log('Self-contained editor files generated in .review.local');
