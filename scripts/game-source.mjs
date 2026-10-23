// Shared reader for validators and disposable browser fixtures.
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export const root=resolve(import.meta.dirname,'..');
export function gameSource(){return readFileSync(resolve(root,'assets/game/game.js'),'utf8');}
export function validationSource(){
  const html = readFileSync(resolve(root,'index.html'),'utf8');
  const m3d = resolve(root,'assets/game/models3d.js');
  const extra = /models3d\.js/.test(html) && existsSync(m3d) ? '\n'+readFileSync(m3d,'utf8') : '';
  return html+'\n'+gameSource()+extra;
}
export function inlineGame(html){
  return html.replace('<script src="assets/game/game.js"></script>',()=>'<script>\n'+gameSource().replace(/\/\/# sourceMappingURL=.*\n?/,'').trimEnd()+'\n</script>');
}
