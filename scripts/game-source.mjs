// Shared reader for validators and disposable browser fixtures.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export const root=resolve(import.meta.dirname,'..');
export function gameSource(){return readFileSync(resolve(root,'assets/game/game.js'),'utf8');}
export function validationSource(){return readFileSync(resolve(root,'index.html'),'utf8')+'\n'+gameSource()+'\n'+readFileSync(resolve(root,'assets/game/models3d.js'),'utf8');}
export function inlineGame(html){
  return html.replace('<script src="assets/game/game.js"></script>',()=>'<script>\n'+gameSource().replace(/\/\/# sourceMappingURL=.*\n?/,'').trimEnd()+'\n</script>');
}
