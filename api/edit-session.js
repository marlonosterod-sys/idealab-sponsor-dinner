import { clearCookie, createCookie, hasSession, matchesPassword } from './_auth.js'
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store')
  if(req.method==='GET') return res.status(200).json({ok:hasSession(req)})
  if(req.method==='DELETE'){res.setHeader('Set-Cookie',clearCookie());return res.status(200).json({ok:true})}
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
  const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})
  if(!matchesPassword(body.password))return res.status(401).json({error:'Passwort ist nicht korrekt.'})
  res.setHeader('Set-Cookie',createCookie());return res.status(200).json({ok:true})
}
