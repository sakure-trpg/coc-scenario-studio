import {env} from 'cloudflare:workers';
export async function POST(req:Request){
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
 const type=req.headers.get('content-type')||'';if(!['image/png','image/jpeg','image/webp','image/gif'].includes(type))return Response.json({error:'PNG/JPEG/WebP/GIF画像を選択してください。'},{status:400});
 const bytes=await req.arrayBuffer();if(bytes.byteLength>8*1024*1024)return Response.json({error:'画像は8MB以下にしてください。'},{status:400});
 if(!env.BUCKET)return Response.json({error:'画像保存先が利用できません。'},{status:503});
 const id=crypto.randomUUID();await env.BUCKET.put(id,bytes,{httpMetadata:{contentType:type}});return Response.json({src:'/api/assets/'+id});
}
