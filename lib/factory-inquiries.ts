// Server-only bridge. Activated after purchase via private deployment environment variables.
export async function receiveFactoryInquiry(request: Request, payload: unknown, kind: string): Promise<{status:number;body:Record<string,unknown>}|null> {
 const endpoint=process.env.FACTORY_INQUIRY_ENDPOINT,token=process.env.FACTORY_INQUIRY_TOKEN;
 if(!endpoint&&!token)return null;
 if(!endpoint||!token)return {status:503,body:{ok:false,error:'Das Kontaktformular ist vorübergehend nicht verfügbar. Bitte kontaktieren Sie den Betrieb direkt.'}};
 try {
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({kind,sourceHost:new URL(request.url).hostname,payload}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
  const body=await response.json();
  return {status:response.status,body};
 }catch{return {status:503,body:{ok:false,error:'Ihre Anfrage konnte gerade nicht gespeichert werden. Bitte erneut versuchen oder den Betrieb direkt kontaktieren.'}};}
}
