/** HTTP local uniquement. GitHub Pages ne peut pas servir ces POST. */
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createService,ApiFault} from './core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createLocalServer(rootDir=root){
  const api=createService(rootDir);
  return http.createServer(async (req,res)=>{
    const url=(req.url||'').split('?')[0];
    function respond(status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));}
    if(req.method==='GET'&&url==='/v1/metadata')return respond(200,api.metadata());
    if(req.method==='GET'&&url==='/v1/schema')return respond(200,api.scenarioSchema);
    if(req.method==='GET'&&url==='/openapi.json')return respond(200,api.openapi);
    if(url!=='/v1/simulations')return respond(404,{status:'error',error:{code:'NOT_FOUND',message:'Ressource inconnue'}});
    if(req.method!=='POST')return respond(405,{status:'error',error:{code:'METHOD_NOT_ALLOWED',message:'Utiliser POST'}});
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return respond(415,{status:'error',error:{code:'UNSUPPORTED_MEDIA_TYPE',message:'Content-Type: application/json requis'}});
    let raw='',size=0;
    try {
      for await(const chunk of req){size+=chunk.length;if(size>2_000_000)throw new ApiFault('BODY_TOO_LARGE','Corps JSON supérieur à 2 Mo.',413);raw+=chunk.toString('utf8');}
      let data;try{data=JSON.parse(raw);}catch{throw new ApiFault('INVALID_JSON','JSON illisible.',400);}
      return respond(200,api.simulate(data));
    }catch(e){return respond(e instanceof ApiFault?e.status:500,{status:'error',error:{code:e instanceof ApiFault?e.code:'INTERNAL_ERROR',message:e instanceof ApiFault?e.message:'Calcul interrompu; consulter les logs locaux.'}});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(!process.argv.includes('--enable-local')){
    console.error('API DESACTIVEE. Pour tester localement : node api-preview-59/server.mjs --enable-local');process.exitCode=1;
  }else{
    const server=createLocalServer();server.listen(0,'127.0.0.1',()=>console.log(`Prototype LOCAL uniquement : http://127.0.0.1:${server.address().port}/v1/metadata`));
  }
}
