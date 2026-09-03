/* ---------- 데이터 ---------- */
const COMPANIES=[
{id:'ai',name:'배정호 AI 테크',category:'우량주',base:50000,up:['새로운 휴머노이드 AI 개발 성공','새로운 AI 모델 출시'],down:['AI 코드에 심각한 오류 발생','배정호 AI 테크 보안 사고 발생']},
{id:'bike',name:'강동하 픽시 바이크',category:'테마주',base:15000,up:['강동하 픽시 바이크 SNS로 큰 유행','강동하 픽시 바이크 신제품 출시'],down:['픽시 작물 유행으로 강동하 픽시 바이크 명예 추락','강동하 픽시 바이크 신제품 치명적 결함 발생']},
{id:'spar',name:'조승우 스파링 아카데미',category:'일반주',base:10000,up:['치안이 안 좋아지며 호신술 학원 떠올라','조승우 스파링 아카데미 원장 조승우 UFC 세계 재패'],down:['학교에서 스파링을 하는 일명 야차룰 유행... 학교폭력 우려','조승우 스파링 아카데미 시설 재검토 필요']},
{id:'model',name:'허진욱 프라모델',category:'일반주',base:8000,up:['허진욱 프라모델 새로운 프라모델 출시','최근 십대들 SNS에서 프라모델 만들기 유행'],down:['허진욱 프라모델 제조과정에서 유해 물질 발견... 전량 회수','허진욱 프라모델 제품 또다시 가격 인상... 지갑 사정이 남아나지 않아']},
{id:'motors',name:'전민기 모터스',category:'우량주',base:40000,up:['전민기 모터스 차로 레이싱 대회 5연속 우승!','전민기 모터스 신차 출시!'],down:['전민기 모터스 부품중 중국산 부품 나와..','전민기 모터스 전기차 안전 위험 요소 검토하지 않아 논란']},
{id:'sports',name:'곽청명 스포츠 용품',category:'테마주',base:12000,up:['손흥민 가장 애용하는 브랜드 곽청명 스포츠라고 밝혀!!','곽청명 스포츠 신제품 신축성, 기존 시장에는 없던 기술'],down:['곽청명 스포츠 모델 학폭 논란','최근 중국산 스포츠 용품 리뷰 챌린지 유행']},
{id:'game',name:'박규현 게임 랩',category:'작전주',base:3000,up:['10대부터 60대까지 게임 열풍!!','박규현 게임 랩 새로운 게임 장르 구축'],down:['학생들의 게임 중독 날이 갈수록 심해져','박규현 게임 랩 새로운 게임 출시 지연....']}
];

const CATEGORY_RANGE={
  '우량주':[0.5,1.5],
  '테마주':[1,2.5],
  '일반주':[1,2],
  '작전주':[2,4]
};

const DAY_LENGTH=180000;      // 3분 = 1 Day
const TICK_LENGTH=10000;      // 10초마다 시세 변동
const RECOVERY_LENGTH=600000; // 부도 후 10분 재상장
const PROMOTE_STREAK=5;
const BANKRUPT_STREAK=5;
const BANKRUPT_PRICE=100;
const INIT_CASH=100000;
const KEY='richStockGame_v2';

/* ---------- 유틸 ---------- */
const $=id=>document.getElementById(id);
const randRange=(a,b)=>Math.random()*(b-a)+a;
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
const fmtWon=n=>Math.round(n).toLocaleString('ko-KR')+'원';
const fmtPct=p=>(p>=0?'+':'')+p.toFixed(2)+'%';
const pad2=n=>String(n).padStart(2,'0');

/* ---------- 상태 생성/저장/로드 ---------- */
function newGameState(){
  const now=Date.now();
  const prices={}, dayOpenPrices={}, companyState={};
  COMPANIES.forEach(c=>{
    prices[c.id]=c.base;
    dayOpenPrices[c.id]=c.base;
    companyState[c.id]={category:c.category,status:'active',upStreak:0,downStreak:0,bankruptTs:null};
  });
  const state={
    cash:INIT_CASH,day:1,holdings:{},
    prices,dayOpenPrices,companyState,
    dayStartTs:now,lastTickTs:now,
    todayNews:[],pendingModal:true
  };
  state.todayNews=generateNews(state);
  applyDailyStreaks(state,true);
  return state;
}

function generateNews(state){
  const candidates=COMPANIES.filter(c=>state.companyState[c.id].status!=='bankrupt');
  const shuffled=[...candidates].sort(()=>Math.random()-0.5).slice(0,Math.min(3,candidates.length));
  return shuffled.map(c=>{
    const dir=Math.random()<0.5?'up':'down';
    return {companyId:c.id,direction:dir,headline:pick(c[dir])};
  });
}

function save(){ localStorage.setItem(KEY,JSON.stringify(state)); }

function load(){
  const raw=localStorage.getItem(KEY);
  if(!raw) return newGameState();
  let s;
  try{ s=JSON.parse(raw); }catch(e){ return newGameState(); }
  if(!s||!s.prices||!s.companyState) return newGameState();
  const elapsed=Date.now()-s.dayStartTs;
  if(!s.pendingModal && elapsed>=DAY_LENGTH){
    s.day+=1;
    s.dayOpenPrices={...s.prices};
    s.todayNews=generateNews(s);
    applyDailyStreaks(s,false);
    s.pendingModal=true;
    s.dayStartTs=Date.now();
    s.lastTickTs=Date.now();
  }
  return s;
}

/* ---------- 승격 / 부도 ---------- */
function applyDailyStreaks(state,isInitial){
  const newsMap={};
  state.todayNews.forEach(n=>newsMap[n.companyId]=n.direction);
  COMPANIES.forEach(c=>{
    const cs=state.companyState[c.id];
    if(cs.status==='bankrupt') return;
    const dir=newsMap[c.id];
    if(dir==='up'){
      cs.upStreak+=1; cs.downStreak=0;
      if(cs.category!=='우량주' && cs.upStreak>=PROMOTE_STREAK){
        cs.category='우량주'; cs.upStreak=0;
        if(!isInitial) queueToast('🎉 '+c.name+', 5일 연속 상승으로 [우량주] 승격!');
      }
    }else if(dir==='down'){
      cs.downStreak+=1; cs.upStreak=0;
      if(cs.downStreak>=BANKRUPT_STREAK){
        bankruptCompany(state,c.id,!isInitial);
      }
    }else{
      cs.upStreak=0; cs.downStreak=0;
    }
  });
}

function bankruptCompany(state,id,notify){
  const cs=state.companyState[id];
  if(cs.status==='bankrupt') return;
  cs.status='bankrupt';
  cs.bankruptTs=Date.now();
  cs.upStreak=0; cs.downStreak=0;
  state.holdings[id]=0;
  if(notify){
    const co=COMPANIES.find(c=>c.id===id);
    queueToast('💥 '+co.name+' 부도 처리! 상장폐지되었습니다.');
  }
}

function checkRecovery(){
  const now=Date.now();
  COMPANIES.forEach(c=>{
    const cs=state.companyState[c.id];
    if(cs.status==='bankrupt' && now-cs.bankruptTs>=RECOVERY_LENGTH){
      cs.status='active'; cs.bankruptTs=null;
      cs.upStreak=0; cs.downStreak=0;
      state.prices[c.id]=c.base;
      state.dayOpenPrices[c.id]=c.base;
      queueToast('🔔 '+c.name+' 재상장! 초기 가격으로 거래가 재개됩니다.');
    }
  });
}

/* ---------- 시세 변동 ---------- */
function tick(){
  const newsMap={};
  state.todayNews.forEach(n=>newsMap[n.companyId]=n.direction);
  COMPANIES.forEach(c=>{
    const cs=state.companyState[c.id];
    if(cs.status==='bankrupt') return;
    const [lo,hi]=CATEGORY_RANGE[cs.category];
    const dir=newsMap[c.id];
    let pct;
    if(dir==='up'){
      pct = Math.random()<0.05 ? -randRange(lo*0.5,hi*0.5) : randRange(lo*1.2,hi*1.8);
    }else if(dir==='down'){
      pct = Math.random()<0.15 ? randRange(lo*0.5,hi*0.5) : -randRange(lo*1.2,hi*1.8);
    }else{
      pct = (Math.random()<0.5?-1:1)*randRange(lo,hi);
    }
    let price=state.prices[c.id]*(1+pct/100);
    price=Math.max(1,Math.round(price));
    state.prices[c.id]=price;
    if(price<=BANKRUPT_PRICE) bankruptCompany(state,c.id,true);
  });
}

function checkDayChange(){
  const now=Date.now();
  if(now-state.dayStartTs>=DAY_LENGTH){
    state.day+=1;
    state.dayOpenPrices={...state.prices};
    state.todayNews=generateNews(state);
    applyDailyStreaks(state,false);
    state.pendingModal=true;
    openDayModal();
  }
}

/* ---------- 거래 ---------- */
function buy(id){
  const cs=state.companyState[id];
  if(cs.status==='bankrupt') return;
  const input=$('qty-'+id);
  const qty=parseInt(input.value,10);
  if(!qty||qty<=0) return;
  const cost=state.prices[id]*qty;
  if(state.cash<cost){ alert('현금이 부족합니다.'); return; }
  state.cash-=cost;
  state.holdings[id]=(state.holdings[id]||0)+qty;
  save(); renderDynamic();
}

function sell(id){
  const cs=state.companyState[id];
  if(cs.status==='bankrupt') return;
  const input=$('qty-'+id);
  const qty=parseInt(input.value,10);
  if(!qty||qty<=0) return;
  const have=state.holdings[id]||0;
  if(have<qty){ alert('보유 수량이 부족합니다.'); return; }
  state.holdings[id]=have-qty;
  state.cash+=state.prices[id]*qty;
  save(); renderDynamic();
}

function resetGame(){
  if(!confirm('정말 게임을 초기화하시겠습니까? 모든 진행 상황이 사라집니다.')) return;
  state=newGameState();
  save();
  buildMarket();
  renderDynamic();
  openDayModal();
}

/* ---------- 모달 ---------- */
let modalReason='day';

function renderModalContent(){
  $('modalDay').textContent='Day '+state.day;
  const box=$('modalNews');
  box.innerHTML='';
  state.todayNews.forEach(n=>{
    const co=COMPANIES.find(c=>c.id===n.companyId);
    const item=document.createElement('div');
    item.className='news-item';
    item.innerHTML=
      '<span class="news-arrow '+n.direction+'">'+(n.direction==='up'?'▲':'▼')+'</span>'+
      '<div><p class="news-co">'+co.name+'</p><p class="news-headline">'+n.headline+'</p></div>';
    box.appendChild(item);
  });
}

function openDayModal(){
  modalReason='day';
  renderModalContent();
  $('modalOverlay').classList.add('show');
}

function openNewsView(){
  modalReason='view';
  renderModalContent();
  $('modalOverlay').classList.add('show');
}

function closeModal(){
  if(modalReason==='day'){
    state.pendingModal=false;
    state.dayStartTs=Date.now();
    state.lastTickTs=Date.now();
    save();
  }
  $('modalOverlay').classList.remove('show');
  renderDynamic();
}

/* ---------- 토스트 ---------- */
function queueToast(msg){
  const box=$('toastContainer');
  const el=document.createElement('div');
  el.className='toast';
  el.textContent=msg;
  box.appendChild(el);
  setTimeout(()=>{
    el.classList.add('fade-out');
    setTimeout(()=>el.remove(),300);
  },4000);
}

/* ---------- 렌더링 ---------- */
function buildMarket(){
  const grid=$('marketGrid');
  grid.innerHTML='';
  COMPANIES.forEach(c=>{
    const card=document.createElement('div');
    card.className='stock-card';
    card.id='card-'+c.id;
    card.innerHTML=
      '<div class="card-top">'+
        '<p class="co-name">'+c.name+'</p>'+
        '<span class="badge" id="badge-'+c.id+'">'+c.category+'</span>'+
      '</div>'+
      '<div class="price-row">'+
        '<span class="co-price" id="price-'+c.id+'"></span>'+
        '<span class="co-change" id="change-'+c.id+'"></span>'+
      '</div>'+
      '<p class="co-hold">보유 <strong id="hold-'+c.id+'">0주</strong></p>'+
      '<div class="trade">'+
        '<input type="number" id="qty-'+c.id+'" value="1" min="1" step="1">'+
        '<button class="btn-buy" onclick="buy(\''+c.id+'\')">매수</button>'+
        '<button class="btn-sell" onclick="sell(\''+c.id+'\')">매도</button>'+
      '</div>'+
      '<div class="bankrupt-overlay">'+
        '<span class="bankrupt-label">부도 (상장폐지)</span>'+
        '<span class="bankrupt-timer" id="recovery-'+c.id+'"></span>'+
      '</div>';
    grid.appendChild(card);
  });
}

function renderDynamic(){
  $('dayLabel').textContent='Day '+state.day;

  let totalStock=0;
  const now=Date.now();

  COMPANIES.forEach(c=>{
    const cs=state.companyState[c.id];
    const card=$('card-'+c.id);
    card.classList.toggle('is-bankrupt',cs.status==='bankrupt');

    const badge=$('badge-'+c.id);
    badge.textContent=cs.category;
    badge.className='badge '+cs.category;

    if(cs.status==='bankrupt'){
      const remain=Math.max(0,RECOVERY_LENGTH-(now-cs.bankruptTs));
      const m=Math.floor(remain/60000), s=Math.floor((remain%60000)/1000);
      $('recovery-'+c.id).textContent='재상장까지 '+pad2(m)+':'+pad2(s);
      return;
    }

    const price=state.prices[c.id];
    const open=state.dayOpenPrices[c.id]||price;
    const pct=((price-open)/open)*100;
    const hold=state.holdings[c.id]||0;
    totalStock+=price*hold;

    $('price-'+c.id).textContent=fmtWon(price);
    const changeEl=$('change-'+c.id);
    changeEl.textContent=fmtPct(pct);
    changeEl.className='co-change '+(pct>=0?'up':'down');
    $('hold-'+c.id).textContent=hold+'주';
  });

  const total=state.cash+totalStock;
  const returnPct=((total-INIT_CASH)/INIT_CASH)*100;
  $('statCash').textContent=fmtWon(state.cash);
  $('statTotal').textContent=fmtWon(total);
  const retEl=$('statReturn');
  retEl.textContent=fmtPct(returnPct);
  retEl.className='stat-value '+(returnPct>=0?'pos':'neg');
}

/* ---------- 초기화 및 게임 루프 ---------- */
let state=load();

$('resetBtn').addEventListener('click',resetGame);
$('modalClose').addEventListener('click',closeModal);
$('newsBtn').addEventListener('click',openNewsView);

buildMarket();
renderDynamic();
if(state.pendingModal) openDayModal();

setInterval(()=>{
  checkRecovery();
  if(!state.pendingModal){
    checkDayChange();
    if(!state.pendingModal){
      const now=Date.now();
      if(now-state.lastTickTs>=TICK_LENGTH){
        tick();
        state.lastTickTs=now;
      }
    }
  }
  save();
  renderDynamic();
},1000);