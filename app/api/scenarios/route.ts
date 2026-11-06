import {activeScenarioId,listScenarios,createScenario,openScenario} from '../../../lib/store';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json({activeScenarioId:await activeScenarioId(),scenarios:await listScenarios()},{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:(e as Error).message},{status:500});}}
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 const body=await request.json() as {action:string;title:string;scenarioId:string};
 const state=body.action==='create'?await createScenario(body.title):body.action==='open'?await openScenario(body.scenarioId):null;
 if(!state)throw Error('未対応の操作です。');return Response.json(state);
 }catch(e){return Response.json({error:(e as Error).message},{status:400});}}
