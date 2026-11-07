/** Wameed mail relay. Set WAMEED_MAIL_SECRET in Script Properties (32+ chars).
 * Deploy under the platform Gmail account, execute as owner, access Anyone.
 * Requests are authenticated by HMAC; no secret belongs in source or URLs.
 */
function doPost(e) {
  const reply = (ok) => ContentService.createTextOutput(JSON.stringify({ok: ok})).setMimeType(ContentService.MimeType.JSON);
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || e.postData.contents.length > 20000) return reply(false);
    const envelope = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('WAMEED_MAIL_SECRET');
    if (!secret || secret.length < 32 || typeof envelope.payload !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.signature || '')) return reply(false);
    const expected = Utilities.computeHmacSha256Signature(envelope.payload, secret, Utilities.Charset.UTF_8).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
    let mismatch = 0;
    for (let i=0; i<64; i++) mismatch |= expected.charCodeAt(i) ^ envelope.signature.charCodeAt(i);
    if (mismatch) return reply(false);
    const mail = JSON.parse(envelope.payload);
    if (!Number.isInteger(mail.timestamp) || Math.abs(Date.now()/1000 - mail.timestamp) > 300 || !/^[a-f0-9]{32}$/.test(mail.nonce || '')) return reply(false);
    if (typeof mail.to !== 'string' || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(mail.to) || mail.to.length>254) return reply(false);
    if (typeof mail.subject !== 'string' || !mail.subject.includes('WAMEED') || mail.subject.length>200 || /[\r\n]/.test(mail.subject)) return reply(false);
    if (typeof mail.body !== 'string' || mail.body.length>12000) return reply(false);
    if (!lock.tryLock(5000)) return reply(false);
    const cache = CacheService.getScriptCache();
    const id = 'mail:' + mail.nonce;
    if (cache.get(id) || MailApp.getRemainingDailyQuota()<1) return reply(false);
    cache.put(id, 'used', 600);
    MailApp.sendEmail({to:mail.to, subject:mail.subject, body:mail.body, name:'WAMEED | وميض'});
    return reply(true);
  } catch (_) { return reply(false); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
