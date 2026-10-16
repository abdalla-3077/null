import type { StudySnapshot } from '../shared/types';

export interface StudyPalette {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
}

/** Full-page Study timer served at null://study. Syncs with the main-process
 *  engine over fetch('null://study-state') + fetch('null://study-cmd?...'). */
export function studyHtml(p: StudyPalette, appearance: 'light' | 'dark', initial: StudySnapshot): string {
  const initJson = JSON.stringify(initial).replace(/</g, '\\u003c');
  return (
    '<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="' +
    appearance +
    '"><title>Study — Null</title>' +
    '<style>' +
    ':root{' +
    '--background:' + p.bg + ';--surface:' + p.surface + ';--surface-hover:' + p.surfaceHover + ';' +
    '--border:' + p.border + ';--border-strong:' + p.borderStrong + ';--foreground:' + p.text + ';' +
    '--muted:' + p.muted + ';--accent:' + p.accent + ';--accent-hover:' + p.accentHover + ';' +
    '--accent-soft:' + p.accentSoft + ';--success:' + p.success + ';--warning:' + p.warning + ';--danger:' + p.danger + ';' +
    '--study-accent:var(--accent);' +
    '}' +
    '*{box-sizing:border-box}::selection{background:var(--accent);color:#fff}' +
    'body{margin:0;min-height:100vh;background:var(--background);color:var(--foreground);' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;-webkit-font-smoothing:antialiased}' +
    ':focus-visible{outline:2px solid var(--study-accent);outline-offset:2px;border-radius:6px}' +
    '.bar{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-bottom:1px solid var(--border)}' +
    '.lockup{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:.34em;font-size:12px}' +
    '.live{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}' +
    '.dot{width:8px;height:8px;border-radius:50%;background:var(--border-strong)}' +
    '.dot.running{background:var(--success);animation:pl 1.4s ease-in-out infinite}' +
    '.dot.paused{background:var(--warning)}.dot.finished{background:var(--study-accent)}' +
    '@keyframes pl{0%,100%{opacity:1}50%{opacity:.35}}' +
    'main{max-width:1020px;margin:0 auto;padding:26px 22px 60px}' +
    '.modes{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:4px;margin:0 0 14px;border-radius:12px;background:var(--surface);border:1px solid var(--border)}' +
    '.modes button{border:0;background:transparent;color:var(--muted);cursor:pointer;padding:10px 4px;border-radius:9px;font:inherit;font-size:12.5px;font-weight:700;white-space:nowrap}' +
    '.modes button:hover{color:var(--foreground)}' +
    '.modes button.active{background:var(--accent-soft);color:var(--foreground);box-shadow:inset 0 0 0 1px var(--border-strong)}' +
    '.cols{display:grid;grid-template-columns:1.05fr .95fr;gap:12px}' +
    '.card{border:1px solid var(--border);border-radius:14px;background:var(--surface);padding:16px}' +
    '.card h3{margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}' +
    '.stage{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 14px;min-height:340px;justify-content:center}' +
    '.big{font-size:34px;font-weight:700;font-variant-numeric:tabular-nums}' +
    '.huge{font-size:clamp(44px,7vw,64px);font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.1}' +
    '.sub{color:var(--muted);font-size:12px;font-weight:600;text-transform:capitalize}' +
    '.tlabel{color:var(--muted);font-size:13px;font-style:italic;margin:0}' +
    '.ring{position:relative}' +
    '.ring-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}' +
    '.flip{display:flex;gap:10px}' +
    '.flip-cell{min-width:90px;padding:14px 10px 10px;text-align:center;border:1px solid var(--border-strong);border-radius:12px;background:var(--background);box-shadow:inset 0 -3px 0 var(--border)}' +
    '.flip-num{display:block;font-size:38px;font-weight:700;font-variant-numeric:tabular-nums}' +
    '.flip-label{display:block;margin-top:4px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}' +
    '.bars-row{display:flex;gap:4px;width:100%}' +
    '.bars-row i{flex:1;height:10px;border-radius:3px;background:var(--border)}' +
    '.bars-row i.on{background:var(--study-accent)}' +
    '.neon-t{font-size:clamp(46px,7vw,66px);font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1;' +
    'background:linear-gradient(120deg,var(--study-accent),var(--foreground) 70%);-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '.neon-track{width:100%;height:8px;border-radius:5px;background:var(--border);overflow:hidden}' +
    '.neon-track i{display:block;height:100%;background:linear-gradient(90deg,var(--study-accent),var(--success))}' +
    '.dots-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;width:100%}' +
    '.dots-grid i{aspect-ratio:1;border-radius:50%;background:var(--border)}' +
    '.dots-grid i.on{background:var(--study-accent)}' +
    '.controls{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}' +
    '.btn{padding:9px 18px;border-radius:10px;border:1px solid var(--border);background:var(--background);color:var(--foreground);cursor:pointer;font:inherit;font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:7px}' +
    '.btn:hover{border-color:var(--border-strong)}' +
    '.btn.primary{background:var(--study-accent);border-color:var(--study-accent);color:#fff}' +
    '.btn.ghost{background:transparent;border-color:transparent;color:var(--muted)}' +
    '.btn.ghost:hover{color:var(--foreground);background:var(--surface-hover)}' +
    '.btn:disabled{opacity:.45;cursor:default}' +
    '.keys{margin:8px 0 0;color:var(--muted);font-size:12px}' +
    '.keys kbd{border:1px solid var(--border);border-radius:5px;padding:1px 6px;font:inherit;font-size:11px;background:var(--surface);color:var(--foreground)}' +
    '.side{display:flex;flex-direction:column;gap:10px}' +
    '.preset-row{display:flex;gap:6px;flex-wrap:wrap}' +
    '.preset{border:1px solid var(--border);background:var(--background);color:var(--foreground);border-radius:9px;padding:8px 14px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700}' +
    '.preset.active{border-color:var(--study-accent);background:var(--accent-soft)}' +
    '.custom{display:flex;gap:6px;margin-top:8px}' +
    'input[type=number],input[type=text],input[type=datetime-local]{padding:8px 11px;border-radius:8px;border:1px solid var(--border);background:var(--background);color:var(--foreground);font:inherit}' +
    'input:focus{border-color:var(--study-accent);box-shadow:0 0 0 3px var(--accent-soft);outline:none}' +
    '.custom input{width:76px}' +
    '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    '.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}' +
    '.grid2 label,.grid3 label{display:flex;flex-direction:column;gap:6px;font-size:11.5px;font-weight:600;color:var(--muted)}' +
    '.hint{color:var(--muted);font-size:12px;line-height:1.6;margin:8px 0 0}' +
    '.faces{display:flex;gap:6px;flex-wrap:wrap}' +
    '.face{border:1px solid var(--border);background:var(--background);color:var(--muted);border-radius:9px;padding:8px 14px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700}' +
    '.face.active{color:var(--foreground);border-color:var(--study-accent);background:var(--accent-soft)}' +
    '.hues{display:flex;gap:8px}' +
    '.hue{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid var(--border-strong);padding:0}' +
    '.hue.active{border-color:#fff;box-shadow:0 0 0 2px var(--surface),0 0 0 4px currentColor}' +
    '.hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
    '.hist li{display:flex;gap:10px;align-items:center;padding:7px 10px;border:1px solid var(--border);border-radius:9px;background:var(--background)}' +
    '.hist b{font-size:12px;display:block}.hist small{color:var(--muted);font-size:11px}' +
    '.hist .m{flex:1;min-width:0}.hist .at{color:var(--muted);font-size:10.5px;flex:none}' +
    '@media(max-width:760px){.cols{grid-template-columns:1fr}.modes{grid-template-columns:repeat(3,1fr)}}' +
    '@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}' +
    '</style></head><body>' +
    '<header class="bar"><span class="lockup">NULL · STUDY</span><span class="live"><span class="dot" id="dot"></span><span id="live">—</span></span></header>' +
    '<main>' +
    '<nav class="modes" id="modes" aria-label="Timer mode"></nav>' +
    '<div class="cols"><div>' +
    '<section class="card stage" id="stage" aria-live="off"></section>' +
    '<div class="controls" id="controls"></div>' +
    '<p class="keys"><kbd>Space</kbd> start / pause &nbsp; <kbd>R</kbd> reset</p>' +
    '</div><div class="side" id="side"></div></div>' +
    '</main>' +
    '<script>' +
    'var S = ' + initJson + ';' +
    'var HUES = {auto:null,cobalt:"#4f7cff",ember:"#e5484d",violet:"#8e7cff",mint:"#30a46c",amber:"#f5a524",rose:"#e93d82"};' +
    'var MODES = [["focus","Focus"],["pomodoro","Pomodoro"],["interval","Interval"],["countdown","Countdown"],["exam","Exam"],["stopwatch","Stopwatch"]];' +
    'var FACES = [["ring","Ring"],["minimal","Minimal"],["flip","Flip"],["bars","Bars"],["analog","Analog"],["neon","Neon"],["dots","Dots"]];' +
    'function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}' +
    'function pad(n){return String(n).padStart(2,"0");}' +
    'function fmt(ms,hrs){var t=Math.max(0,Math.ceil(ms/1000));var h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;' +
    'if(hrs||h>0)return h+":"+pad(m)+":"+pad(s);return m+":"+pad(s);}' +
    'function fmtLong(ms){var t=Math.max(0,Math.ceil(ms/1000));var d=Math.floor(t/86400),h=Math.floor(t%86400/3600),m=Math.floor(t%3600/60),s=t%60;' +
    'if(d>0)return d+"d "+h+"h";if(h>0)return h+"h "+pad(m)+"m";if(m>0)return m+"m "+pad(s)+"s";return s+"s";}' +
    'function remaining(){if(S.mode==="exam"){if(S.status==="paused")return Math.max(0,S.pausedMs);if(S.examTargetAt==null)return 0;return Math.max(0,S.examTargetAt-Date.now());}' +
    'if(S.status==="running"&&S.endsAt!=null)return Math.max(0,S.endsAt-Date.now());' +
    'if(S.status==="paused")return Math.max(0,S.pausedMs);if(S.status==="finished")return 0;return S.totalMs;}' +
    'function elapsed(){if(S.mode!=="stopwatch")return 0;var b=S.swAccumMs||0;if(S.status==="running"&&S.swStartedAt!=null)return b+(Date.now()-S.swStartedAt);return b;}' +
    'function faceVal(){return S.mode==="stopwatch"?elapsed():remaining();}' +
    'function prog(){if(S.mode==="stopwatch"||!(S.totalMs>0))return 0;return Math.min(1,Math.max(0,1-remaining()/S.totalMs));}' +
    'function modeName(m){for(var i=0;i<MODES.length;i++)if(MODES[i][0]===m)return MODES[i][1];return m;}' +
    'function phaseText(){if(S.mode==="pomodoro"){if(S.phase==="focus")return "Focus · Round "+S.round+"/"+S.rounds;if(S.phase==="long")return "Long break";return "Short break";}' +
    'if(S.mode==="interval")return (S.iPhase==="work"?"Work":"Rest")+" · Round "+S.iRound+"/"+S.iRounds;' +
    'if(S.mode==="exam"&&S.examTargetAt!=null){try{return "Target · "+new Date(S.examTargetAt).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}catch(e){}}return "";}' +
    'function chipText(){if(S.mode==="stopwatch")return fmt(elapsed(),true);if(S.mode==="exam")return S.examTargetAt==null?"":fmtLong(remaining());return fmt(remaining());}' +
    'function applyHue(){var c=HUES[S.hue];if(c)document.documentElement.style.setProperty("--study-accent",c);else document.documentElement.style.removeProperty("--study-accent");}' +
    'function stageHtml(){var v=faceVal(),t=S.totalMs,p=prog(),st=S.status,sub=st==="finished"?"Done — nice work":st;' +
    'var lbl=S.label&&String(S.label).trim()?\'<p class="tlabel">"\'+esc(S.label.trim())+\'"</p>\':"";' +
    'if(S.face==="minimal")return \'<span class="huge">\'+(S.mode==="exam"?fmtLong(v):fmt(v,true))+\'</span><span class="sub">\'+sub+\'</span>\'+lbl;' +
    'if(S.face==="flip"){var tt=Math.max(0,Math.ceil(v/1000));var h=Math.floor(tt/3600),m=Math.floor(tt%3600/60),s=tt%60;' +
    'return \'<div class="flip"><div class="flip-cell"><span class="flip-num">\'+pad(h)+\'</span><span class="flip-label">hrs</span></div>\'+\'<div class="flip-cell"><span class="flip-num">\'+pad(m)+\'</span><span class="flip-label">min</span></div>\'+\'<div class="flip-cell"><span class="flip-num">\'+pad(s)+\'</span><span class="flip-label">sec</span></div></div>\'+lbl;}' +
    'if(S.face==="bars"){var n="";for(var i=0;i<24;i++)n+="<i class=\'"+(i<Math.round(p*24)?"on":"")+"\'></i>";' +
    'return \'<span class="huge">\'+fmt(v)+\'</span><div class="bars-row">\'+n+\'</div><span class="sub">\'+(st==="finished"?"Done — nice work":Math.round(p*100)+"% · "+st)+\'</span>\'+lbl;}' +
    'if(S.face==="analog"){var sc=Math.ceil(v/1000),sa=((sc%60)/60)*360,ma=p*360,ticks="";' +
    'for(var k=0;k<12;k++){var a=k*30;ticks+=\'<line x1="100" y1="14" x2="100" y2="\'+(a%90===0?"28":"22")+\'" stroke="var(--muted)" stroke-width="\'+(a%90===0?3:1.5)+\'" stroke-linecap="round" transform="rotate(\'+a+\' 100 100)"/>\';}' +
    'return \'<svg viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="92" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="2"/>\'+ticks+\'<line x1="100" y1="100" x2="100" y2="44" stroke="var(--study-accent)" stroke-width="5" stroke-linecap="round" transform="rotate(\'+ma+\' 100 100)"/>\'+ \'<line x1="100" y1="100" x2="100" y2="30" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" transform="rotate(\'+sa+\' 100 100)"/><circle cx="100" cy="100" r="6" fill="var(--study-accent)"/></svg><span class="big">\'+fmt(v)+\'</span><span class="sub">\'+sub+\'</span>\'+lbl;}' +
    'if(S.face==="neon")return \'<span class="neon-t">\'+fmt(v,true)+\'</span><div class="neon-track"><i style="width:\'+Math.round(p*100)+\'%"></i></div><span class="sub">\'+(st==="finished"?"Done — nice work":Math.round(p*100)+"% · "+st)+\'</span>\'+lbl;' +
    'if(S.face==="dots"){var d="";for(var j=0;j<48;j++)d+="<i class=\'"+(j<Math.round(p*48)?"on":"")+"\'></i>";' +
    'return \'<span class="huge">\'+fmt(v)+\'</span><div class="dots-grid">\'+d+\'</div><span class="sub">\'+sub+\'</span>\'+lbl;}' +
    'var r=84,c=2*Math.PI*r;' +
    'return \'<div class="ring"><svg viewBox="0 0 200 200" width="220" height="220"><circle cx="100" cy="100" r="\'+r+\'" fill="none" stroke="var(--border)" stroke-width="11"/>\'+ \'<circle cx="100" cy="100" r="\'+r+\'" fill="none" stroke="\'+(st==="finished"?"var(--success)":"var(--study-accent)")+\'" stroke-width="11" stroke-linecap="round" stroke-dasharray="\'+c+\'" stroke-dashoffset="\'+(c*(1-p))+\'" transform="rotate(-90 100 100)"/></svg>\'+ \'<div class="ring-c"><span class="big">\'+fmt(v)+\'</span><span class="sub">\'+sub+\'</span></div></div>\'+lbl;}' +
    'function renderModes(){var h="";for(var i=0;i<MODES.length;i++){h+=\'<button data-m="\'+MODES[i][0]+\'" class="\'+(S.mode===MODES[i][0]?"active":"")+\'">\'+MODES[i][1]+\'</button>\';}' +
    'document.getElementById("modes").innerHTML=h;}' +
    'function renderControls(){var h="";var exValid=S.examTargetAt!=null&&S.examTargetAt>Date.now();' +
    'if(S.status==="idle"||S.status==="finished"){h+=\'<button class="btn primary" id="cStart" \'+((S.mode==="exam"&&!exValid)?"disabled":"")+\'>\'+(S.status==="finished"?"Start again":S.mode==="stopwatch"?"Start stopwatch":"Start")+\'</button>\';}' +
    'else if(S.status==="running")h+=\'<button class="btn primary" id="cPause">Pause</button>\';' +
    'else h+=\'<button class="btn primary" id="cResume">Resume</button>\';' +
    'h+=\'<button class="btn" id="cReset" \'+(S.status==="idle"?"disabled":"")+\'>Reset</button>\';' +
    'h+=\'<button class="btn ghost" id="cSound">\'+(S.soundOn?"Chime on":"Muted")+\'</button>\';' +
    'document.getElementById("controls").innerHTML=h;}' +
    'function numVal(id,fb){var el=document.getElementById(id);if(!el)return fb;var v=Number(el.value);return isFinite(v)?v:fb;}' +
    'function renderSide(){var h="";var dis=(S.status==="running"||S.status==="paused")?"disabled":"";' +
    'if(S.mode==="focus"||S.mode==="countdown"){h+=\'<section class="card"><h3>Duration</h3><div class="preset-row">\';' +
    'var ps=[15,25,50,90];for(var i=0;i<ps.length;i++){h+=\'<button class="preset \'+(S.totalMs===ps[i]*60000&&S.status==="idle"?"active":"")+\'" data-ms="\'+(ps[i]*60000)+\'">\'+ps[i]+\'m</button>\';}' +
    'h+=\'</div><div class="custom"><input type="number" id="customMin" min="1" max="480" value="45" aria-label="Custom minutes"><button class="btn" id="customStart">Start</button></div></section>\';}' +
    'if(S.mode==="pomodoro"){h+=\'<section class="card"><h3>Pomodoro</h3><div class="grid2">\'+\'<label>Focus (min)<input type="number" id="pf" min="1" max="180" value="\'+Math.round(S.focusMs/60000)+\'" \'+dis+\'></label>\'+\'<label>Short (min)<input type="number" id="ps" min="1" max="60" value="\'+Math.round(S.shortMs/60000)+\'" \'+dis+\'></label>\'+\'<label>Long (min)<input type="number" id="pl" min="1" max="90" value="\'+Math.round(S.longMs/60000)+\'" \'+dis+\'></label>\'+\'<label>Rounds<input type="number" id="pr" min="2" max="8" value="\'+S.rounds+\'" \'+dis+\'></label></div>\'+\'<p class="hint">Every \'+S.rounds+\'th focus earns a long break. Phases advance automatically.</p></section>\';}' +
    'if(S.mode==="interval"){h+=\'<section class="card"><h3>Interval training</h3><div class="grid3">\'+\'<label>Work (min)<input type="number" id="iw" min="0.5" max="180" step="0.5" value="\'+(S.workMs/60000)+\'" \'+dis+\'></label>\'+\'<label>Rest (min)<input type="number" id="ir" min="0.5" max="60" step="0.5" value="\'+(S.restMs/60000)+\'" \'+dis+\'></label>\'+\'<label>Rounds<input type="number" id="in" min="1" max="12" value="\'+S.iRounds+\'" \'+dis+\'></label></div></section>\';}' +
    'if(S.mode==="exam"){var tv="";if(S.examTargetAt!=null){try{var d=new Date(S.examTargetAt);var pp=function(n){return String(n).padStart(2,"0");};tv=d.getFullYear()+"-"+pp(d.getMonth()+1)+"-"+pp(d.getDate())+"T"+pp(d.getHours())+":"+pp(d.getMinutes());}catch(e){}}' +
    'h+=\'<section class="card"><h3>Exam date</h3><input type="datetime-local" id="examAt" value="\'+tv+\'" \'+dis+\' style="width:100%"><p class="hint">Counts down to the moment you need to be ready for.</p></section>\';}' +
    'if(S.mode==="stopwatch"){h+=\'<section class="card"><h3>Stopwatch</h3><p class="hint" style="margin:0">Open-ended timing. Stopping after 60+ seconds logs it to history.</p></section>\';}' +
    'h+=\'<section class="card"><h3>Label</h3><input type="text" id="lbl" maxlength="80" placeholder="e.g. Maths chapter 4" value="\'+esc(S.label)+\'" style="width:100%"></section>\';' +
    'h+=\'<section class="card"><h3>Face</h3><div class="faces">\';' +
    'for(var f=0;f<FACES.length;f++){h+=\'<button class="face \'+(S.face===FACES[f][0]?"active":"")+\'" data-face="\'+FACES[f][0]+\'">\'+FACES[f][1]+\'</button>\';}' +
    'h+=\'</div><h3 style="margin-top:12px">Accent</h3><div class="hues">\';' +
    'for(var hk in HUES){var on=S.hue===hk?" active":"";if(hk==="auto"){h+=\'<button class="hue\'+on+\'" data-hue="auto" title="Follow browser theme" style="background:conic-gradient(var(--danger),var(--warning),var(--success),var(--accent),var(--danger))"></button>\';}' +
    'else{h+=\'<button class="hue\'+on+\'" data-hue="\'+hk+\'" title="\'+hk+\'" style="background:\'+HUES[hk]+";color:"+HUES[hk]+\'"></button>\';}}' +
    'h+=\'</div></section>\';' +
    'h+=\'<section class="card"><h3>History\'+(S.sessions>0?" · "+S.sessions+" done":"")+\'</h3>\';' +
    'if(!S.history||!S.history.length){h+=\'<p class="hint" style="margin:0">Finished sessions land here.</p>\';}' +
    'else{h+=\'<ul class="hist">\';var list=S.history.slice(0,8);for(var q=0;q<list.length;q++){var e=list[q];var when="";try{when=new Date(e.at).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}catch(ee){}' +
    'h+=\'<li><span class="m"><b>\'+esc(e.label||e.mode)+\'</b><small>\'+(e.label?esc(e.mode)+" · ":"")+fmtLong(e.ms)+\'</small></span><span class="at">\'+when+\'</span></li>\';}' +
    'h+=\'</ul><div style="margin-top:8px"><button class="btn ghost" id="histClear">Clear</button></div>\';}' +
    'h+=\'</section>\';document.getElementById("side").innerHTML=h;}' +
    'function render(){applyHue();renderModes();' +
    'document.getElementById("stage").innerHTML=stageHtml();' +
    'renderControls();' +
    'var ae=document.activeElement;var typing=ae&&(ae.tagName==="INPUT"||ae.tagName==="SELECT"||ae.tagName==="TEXTAREA");' +
    'if(!typing)renderSide();' +
    'var live=S.status==="running"||S.status==="paused"||S.status==="finished";' +
    'var d=document.getElementById("dot");d.className="dot "+(S.status==="running"?"running":S.status==="paused"?"paused":S.status==="finished"?"finished":"");' +
    'document.getElementById("live").textContent=live&&chipText()?chipText()+" · "+modeName(S.mode)+(phaseText()?" · "+phaseText():""):"Study Mode";' +
    'try{if(live&&chipText())document.title=chipText()+" · Study — Null";else document.title="Study — Null";}catch(e){}}' +
    'function cmd(action,params){var q="null://study-cmd?action="+encodeURIComponent(action);' +
    'if(params)for(var k in params)q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]);' +
    'fetch(q).then(function(r){return r.json();}).then(function(j){if(j&&j.ok!==false){S=j;render();}}).catch(function(){});}' +
    'function sync(){fetch("null://study-state").then(function(r){return r.json();}).then(function(j){if(j){S=j;render();}}).catch(function(){});}' +
    'document.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest)return;' +
    'var m=t.closest("[data-m]");if(m){cmd("set-mode",{mode:m.getAttribute("data-m")});return;}' +
    'var pr=t.closest("[data-ms]");if(pr){cmd("set-total",{ms:Number(pr.getAttribute("data-ms"))});return;}' +
    'var f=t.closest("[data-face]");if(f){cmd("set-face",{face:f.getAttribute("data-face")});return;}' +
    'var hu=t.closest("[data-hue]");if(hu){cmd("set-hue",{hue:hu.getAttribute("data-hue")});return;}' +
    'if(t.closest("#cStart")){if(S.mode==="focus"||S.mode==="countdown"){var cm=document.getElementById("customMin");var mins=cm?Number(cm.value):NaN;if(isFinite(mins)&&mins>=1&&mins<=480&&S.status!=="paused"){cmd("start",{ms:Math.round(mins*60000)});return;}}cmd("start",{});return;}' +
    'if(t.closest("#customStart")){var c2=document.getElementById("customMin");var m2=c2?Number(c2.value):NaN;if(isFinite(m2)&&m2>=1&&m2<=480)cmd("start",{ms:Math.round(m2*60000)});return;}' +
    'if(t.closest("#cPause")){cmd("pause",{});return;}' +
    'if(t.closest("#cResume")){cmd("resume",{});return;}' +
    'if(t.closest("#cReset")){cmd("reset",{});return;}' +
    'if(t.closest("#cSound")){cmd("set-sound",{on:S.soundOn?0:1});return;}' +
    'if(t.closest("#histClear")){cmd("clear-history",{});return;}});' +
    'document.addEventListener("change",function(e){var t=e.target;if(!t||!t.id)return;' +
    'if(t.id==="lbl"){cmd("set-label",{label:t.value});}' +
    'else if(t.id==="pf"||t.id==="ps"||t.id==="pl"||t.id==="pr"){cmd("set-pomodoro",{focusMs:Math.round(numVal("pf",25)*60000),shortMs:Math.round(numVal("ps",5)*60000),longMs:Math.round(numVal("pl",15)*60000),rounds:Math.round(numVal("pr",4))});}' +
    'else if(t.id==="iw"||t.id==="ir"||t.id==="in"){cmd("set-interval",{workMs:Math.round(numVal("iw",25)*60000),restMs:Math.round(numVal("ir",5)*60000),rounds:Math.round(numVal("in",4))});}' +
    'else if(t.id==="examAt"&&t.value){var tt=new Date(t.value).getTime();if(isFinite(tt))cmd("set-exam-target",{targetAt:tt});}});' +
    'document.addEventListener("keydown",function(e){var t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="SELECT"||t.tagName==="TEXTAREA"))return;' +
    'if(e.code==="Space"){e.preventDefault();if(S.status==="running")cmd("pause",{});else if(S.status==="paused")cmd("resume",{});else{var b=document.getElementById("cStart");if(b&&!b.disabled)b.click();}}' +
    'else if(e.key==="r"||e.key==="R"){cmd("reset",{});}});' +
    'setInterval(function(){var st=document.getElementById("stage");if(st)st.innerHTML=stageHtml();' +
    'var live=S.status==="running"||S.status==="paused";' +
    'try{if(live&&chipText())document.title=chipText()+" · Study — Null";}catch(e){}},250);' +
    'setInterval(sync,1000);render();' +
    '</script></body></html>'
  );
}
