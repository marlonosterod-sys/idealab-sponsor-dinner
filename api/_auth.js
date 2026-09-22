import crypto from 'node:crypto'
const COOKIE='idealab_edit_session'
const MAX_AGE=60*60*12
const secret=()=>process.env.EDIT_SESSION_SECRET||process.env.EDIT_PASSWORD||''
const sign=(value)=>crypto.createHmac('sha256',secret()).update(value).digest('base64url')
export function createCookie(){if(!secret())throw new Error('EDIT_SESSION_SECRET oder EDIT_PASSWORD fehlt.');const expires=String(Math.floor(Date.now()/1000)+MAX_AGE);return `${COOKIE}=${expires}.${sign(expires)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`}
export function clearCookie(){return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`}
export function hasSession(req){if(!secret())return false;const cookie=String(req.headers.cookie||'');const value=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)||'';const [expires,sig]=value.split('.');if(!expires||!sig||Number(expires)<Date.now()/1000)return false;const a=Buffer.from(sign(expires)),b=Buffer.from(sig);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
export function matchesPassword(input){const expected=Buffer.from(process.env.EDIT_PASSWORD||''),actual=Buffer.from(String(input||'').trim());return expected.length>0&&expected.length===actual.length&&crypto.timingSafeEqual(expected,actual)}
