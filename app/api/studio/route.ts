import { action, Conflict, readStore } from '../../../lib/store';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return Response.json((await readStore(new URL(request.url).searchParams.get('scenarioId')||undefined)).state,{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:String(e)},{status:500});}}
export async function POST(request:Request){try{const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});const body=await request.json() as any;const result=await action(body.action,body);return Response.json(result.state);}catch(e){return Response.json({error:(e as Error).message},{status:e instanceof Conflict?409:400});}}
