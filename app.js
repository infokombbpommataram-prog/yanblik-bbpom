if (sessionStorage.getItem('yanblik_auth') !== '1') location.replace('login.html');

const FIELDS = ['tglLayanan','nama','jenisKelamin','instansi','jenisPerusahaan','alamat','email','negara','provinsi','kotaKab','noTelp','noFax','pekerjaan','usia','namaDagang','namaGenerik','pabrik','noReg','noBatch','alamatProduk','kotaProduk','negaraProduk','provinsiProduk','tglKadaluarsa','diperolehDi','tglDiperoleh','tglDigunakan','isuTopik','isiLayanan','petugasPenerima','jenisLayanan','jenisKomoditi','layananMelalui','sumberData','shift','klasifikasi','subKlasifikasi','perluRujuk','rujukan1','sla1','rujukan2','sla2','rujukan3','sla3','rujukan4','sla4','rujukan5','sla5','jawaban','keterangan','namaPetugasInput','namaPenjawab','dijawabMelalui'];

function logout(){ sessionStorage.removeItem('yanblik_auth'); location.replace('login.html'); }

// text/plain agar request tanpa preflight CORS ke GAS
async function gasPost(body){
  const r = await fetch(GAS_URL, { method:'POST', headers:{'Content-Type':'text/plain'}, body:JSON.stringify(body) });
  return r.json();
}

function renderQuota(q){
  const el = document.getElementById('quotaBadge');
  const btn = document.getElementById('btnAnalyze');
  el.innerHTML = 'Kuota AI: <b>'+q.rpmUsed+'/'+q.rpmLimit+'/mnt • '+q.rpdUsed+'/'+q.rpdLimit+'/hari</b>';
  const empty = q.rpmLeft === 0 || q.rpdLeft === 0;
  btn.disabled = empty;
  if (empty) btn.textContent = q.rpdLeft === 0 ? 'Kuota harian habis — pakai isi manual' : 'Kuota menit habis — coba lagi sebentar';
  else btn.textContent = 'Analisis transkrip';
}

async function refreshQuota(){
  try {
    const r = await fetch(GAS_URL + '?action=quota');
    const j = await r.json();
    if (j.ok) renderQuota(j.quota);
  } catch (e) { /* badge tetap apa adanya */ }
}

async function processAnalysis(){
  const text = document.getElementById('transcriptInput').value.trim();
  if (!text) { alert('Harap masukkan teks transkrip percakapan!'); return; }
  showLoading('Gemini sedang membaca transkrip & mengidentifikasi 53 kolom data...');
  try {
    const j = await gasPost({ action:'analyze', transcript:text });
    if (j.quota) renderQuota(j.quota);
    if (!j.ok && j.error === 'quota') {
      hideLoading();
      alert(j.reason === 'rpd' ? 'Kuota harian habis (20/20). Pakai tombol isi manual.' : `Kuota menit habis. Coba lagi ${j.retryAfterSec||60} detik.`);
      return;
    }
    if (!j.ok) throw new Error(j.error || 'Gagal analisis');
    fillForm(j.data);
  } catch (err) { hideLoading(); alert('Error: ' + err.message); }
}

function fillForm(data){
  hideLoading();
  document.getElementById('stepInput').classList.add('d-none');
  document.getElementById('stepReview').classList.remove('d-none');
  FIELDS.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    el.value = f === 'tglLayanan' ? (data[f] || new Date().toISOString().split('T')[0]) : (data[f] || '');
  });
  window.scrollTo(0, 0);
}

function showManualForm(){
  document.getElementById('stepInput').classList.add('d-none');
  document.getElementById('stepReview').classList.remove('d-none');
  document.getElementById('tglLayanan').value = new Date().toISOString().split('T')[0];
  window.scrollTo(0, 0);
}

async function submitToSheet(){
  const formData = {};
  FIELDS.forEach(f => { const el = document.getElementById(f); formData[f] = el ? el.value : ''; });
  // input date HTML selalu ISO; kirim slash agar seragam dengan Sheets.
  if (/^\d{4}-\d{2}-\d{2}$/.test(formData.tglLayanan || '')) formData.tglLayanan = formData.tglLayanan.replace(/-/g, '/');
  showLoading("Sedang menyimpan data ke sheet 'Lembar Kerja'...");
  try {
    const j = await gasPost({ action:'save', formData });
    if (!j.ok) throw new Error(j.error || 'Gagal simpan');
    alert(j.message || 'Tersimpan.');
    hideLoading();
    document.getElementById('transcriptInput').value = '';
    resetToInput();
  } catch (err) { hideLoading(); alert('Error: ' + err.message); }
}

function resetToInput(){
  document.getElementById('stepReview').classList.add('d-none');
  document.getElementById('stepInput').classList.remove('d-none');
}

function showLoading(t){
  document.getElementById('stepInput').classList.add('d-none');
  document.getElementById('stepReview').classList.add('d-none');
  document.getElementById('loadingText').innerText = t;
  document.getElementById('loading').classList.remove('d-none');
}
function hideLoading(){ document.getElementById('loading').classList.add('d-none'); }

refreshQuota();
setInterval(refreshQuota, 30000);
