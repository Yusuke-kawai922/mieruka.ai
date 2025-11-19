import React, { useState, useEffect, useRef } from 'react';
import { Settings, Check, Calendar, ChevronRight, Sparkles, Minus, Plus, Smile, Frown, Meh, ThumbsUp, Star, BookOpen, User, Trophy, TrendingUp } from 'lucide-react';

// --- 設定エリア ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzEUZNzcElKFGcjoBai3ot2S7dkMaq5WSxz-k_2oP4UEvHPdwTjrpb7xi8B1Z8Boki8/exec";
const LIFF_ID = "2008532121-MoQwYDkG";

// --- マスターデータ ---
const SCHOOL_TYPES = [
  { id: 'elem', label: '小学生', color: 'text-orange-500', icon: '🎒' },
  { id: 'junior', label: '中学生', color: 'text-sky-500', icon: '🏫' },
  { id: 'high', label: '高校生', color: 'text-indigo-500', icon: '🎓' },
];

const ACTIVITIES = [
  { id: 'self', label: '自習', icon: '🏠', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  { id: 'juku', label: '塾・予備校', icon: '🏫', color: 'bg-pink-50 text-pink-500 border-pink-200' },
  { id: 'school', label: '学校授業', icon: '👩‍🏫', color: 'bg-emerald-50 text-emerald-500 border-emerald-200' },
  { id: 'homework', label: '宿題', icon: '📝', color: 'bg-blue-50 text-blue-500 border-blue-200' },
  { id: 'exam', label: '定期テスト', icon: '💯', color: 'bg-orange-50 text-orange-500 border-orange-200' },
  { id: 'moshi', label: '模試', icon: '📊', color: 'bg-purple-50 text-purple-500 border-purple-200' },
];

const SUBJECT_DATA = {
  elem: [
    { category: 'きょうか', items: ['国語', '算数', '理科', '社会', '英語', '生活', '音楽', '図工', '家庭', '体育', '道徳'] },
    { category: 'その他', items: ['読書', 'プログラミング', '探究', 'その他'] }
  ],
  junior: [
    { category: '主要5科', items: ['英語', '数学', '国語', '理科', '社会'] },
    { category: '実技', items: ['音楽', '美術', '保体', '技家'] },
    { category: 'その他', items: ['英語検定', '漢字検定', '数学検定', '情報', 'その他'] }
  ],
  high: [
    { category: '英語', items: ['英語', '英単語', '英文法', '長文読解', 'リスニング', '英検/TOEIC'] },
    { category: '数学', items: ['数学I', '数学A', '数学II', '数学B', '数学III', '数学C', '確率統計'] },
    { category: '国語', items: ['現代文', '古文', '漢文', '小論文'] },
    { category: '理科', items: ['物理基礎', '物理', '化学基礎', '化学', '生物基礎', '生物', '地学基礎', '地学'] },
    { category: '地歴公民', items: ['歴史総合', '日本史', '世界史', '地理総合', '地理', '公共', '倫理', '政経'] },
    { category: '情報・他', items: ['情報', '探究', '過去問', 'その他'] }
  ]
};

const EVALUATIONS = [
  { value: 1, icon: Frown, color: 'text-slate-400' },
  { value: 2, icon: Meh, color: 'text-slate-400' },
  { value: 3, icon: Smile, color: 'text-yellow-400' },
  { value: 4, icon: ThumbsUp, color: 'text-orange-400' },
  { value: 5, icon: Star, color: 'text-pink-400' },
];

export default function App() {
  const [view, setView] = useState('loading'); 
  const [userConfig, setUserConfig] = useState({ grade: '', subjects: [] });
  const [submitState, setSubmitState] = useState('idle');
  const [liffUserId, setLiffUserId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // タブ管理 (0:勉強時間, 1:テスト点数, 2:模試偏差値)
  const [activeTab, setActiveTab] = useState(0);

  // データ状態
  const [commonDate, setCommonDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [activity, setActivity] = useState('self');
  
  // 各画面用データ
  const [studyTime, setStudyTime] = useState(60); // 分
  
  // テスト用データ
  const [testScore, setTestScore] = useState(80); // 点数
  const [testMax, setTestMax] = useState(100);    // 満点
  const [testInputMode, setTestInputMode] = useState('score'); // 'score' or 'max'
  
  // 偏差値用データ
  const [examScore, setExamScore] = useState(50); // 偏差値
  
  const [understanding, setUnderstanding] = useState(3);

  // --- 初期化処理 ---
  useEffect(() => {
    const savedConfig = localStorage.getItem('mieruka_config_final');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setUserConfig(parsed);
      setView('main');
    } else {
      setView('grade_select');
    }

    // LIFF初期化 (CDN)
    if (!document.getElementById('liff-sdk')) {
      const script = document.createElement('script');
      script.id = 'liff-sdk';
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.onload = async () => {
        if (window.liff) {
          window.liff.init({ liffId: LIFF_ID })
            .then(() => {
              if (window.liff.isLoggedIn()) {
                window.liff.getProfile()
                  .then(profile => {
                    setLiffUserId(profile.userId);
                    console.log("LIFF Login Success:", profile.userId);
                  })
                  .catch(err => console.error("Profile Error:", err));
              } else {
                window.liff.login(); 
              }
            })
            .catch((err) => {
              console.error("LIFF Init Error:", err);
            });
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  // --- スワイプ処理 ---
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndX = useRef(null);
  const touchEndY = useRef(null);
  const MIN_SWIPE_DISTANCE = 50;

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    
    if (Math.abs(distanceX) > MIN_SWIPE_DISTANCE && Math.abs(distanceX) > Math.abs(distanceY)) {
       if (distanceX > 0) {
         if (activeTab < 2) setActiveTab(activeTab + 1);
       } else {
         if (activeTab > 0) setActiveTab(activeTab - 1);
       }
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // --- アクション ---

  const selectGrade = (gradeId) => {
    setUserConfig({ ...userConfig, grade: gradeId });
    setView('subject_select');
  };

  const saveConfig = (subjects) => {
    if (subjects.length === 0) {
      alert("科目を1つ以上選んでください");
      return;
    }
    const newConfig = { ...userConfig, subjects };
    localStorage.setItem('mieruka_config_final', JSON.stringify(newConfig));
    setUserConfig(newConfig);
    setView('main');
  };

  const handleSubmit = async () => {
    if (!subject) return;

    setSubmitState('submitting');

    let payload = {
      line_user_id: liffUserId || 'guest_user',
      grade: userConfig.grade,
      date: commonDate,
      subject: subject,
      activity: activity,
      understanding: understanding,
    };

    if (activeTab === 0) {
      payload.log_type = 'study';
      payload.minutes = studyTime;
      payload.value = studyTime;
      payload.unit = 'min';
    } else if (activeTab === 1) {
      payload.log_type = 'test';
      payload.value = testScore;
      payload.perfect_score = testMax;
      payload.unit = 'point';
      payload.minutes = 0;
    } else if (activeTab === 2) {
      payload.log_type = 'exam';
      payload.value = examScore;
      payload.unit = 'deviation';
      payload.minutes = 0;
    }
    
    console.log("Sending:", payload);

    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setSubmitState('success');
      setTimeout(() => {
        setSubject('');
        setStudyTime(60);
        setTestScore(80);
        setTestMax(100);
        setExamScore(50);
        setUnderstanding(3);
        setSubmitState('idle');
      }, 1000);

    } catch (error) {
      console.error("Error:", error);
      setErrorMsg('送信エラー。通信環境を確認してください。');
      setSubmitState('idle');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const handleResetConfig = () => {
    if(confirm('設定をリセットしますか？')) {
      localStorage.removeItem('mieruka_config_final');
      setUserConfig({ grade: '', subjects: [] });
      setView('grade_select');
    }
  };

  // --- UI Components ---

  // 数値調整用ボタンセット
  const ControlButtons = ({ onSmallMinus, onBigMinus, onSmallPlus, onBigPlus, stepSmall, stepBig, colorClass }) => (
    <div className="flex flex-col gap-3 max-w-xs mx-auto mt-6 select-none">
      <div className="flex justify-center gap-3">
          <button onClick={onSmallPlus} className={`flex-1 py-3 rounded-xl bg-white border-2 border-slate-100 text-slate-600 font-bold active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1 touch-manipulation`}>
            <Plus size={16} /> {stepSmall}
          </button>
          <button onClick={onBigPlus} className={`flex-1 py-3 rounded-xl ${colorClass.replace('text-', 'bg-')} text-white font-bold active:scale-95 transition-all shadow-lg flex justify-center items-center gap-1 touch-manipulation`}>
            <Plus size={20} /> {stepBig}
          </button>
      </div>
      <div className="flex justify-center gap-3">
          <button onClick={onSmallMinus} className={`flex-1 py-3 rounded-xl bg-white border-2 border-slate-100 text-slate-400 font-bold active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1 touch-manipulation`}>
            <Minus size={16} /> {stepSmall}
          </button>
          <button onClick={onBigMinus} className={`flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold active:scale-95 transition-all flex justify-center items-center gap-1 touch-manipulation`}>
            <Minus size={16} /> {stepBig}
          </button>
      </div>
    </div>
  );

  // 1. 勉強時間入力 (タブ0)
  const StudyTimeAdjuster = () => (
    <div className="text-center my-8">
      <div className="flex items-baseline justify-center gap-1 mb-2">
        <span className="text-7xl font-black tabular-nums tracking-tight text-slate-800">
          {studyTime}
        </span>
        <span className="text-xl font-bold text-slate-400">min</span>
      </div>
      <ControlButtons 
        onSmallMinus={() => setStudyTime(Math.max(0, studyTime - 10))}
        onBigMinus={() => setStudyTime(Math.max(0, studyTime - 30))}
        onSmallPlus={() => setStudyTime(Math.min(480, studyTime + 10))}
        onBigPlus={() => setStudyTime(Math.min(480, studyTime + 30))}
        stepSmall={10} stepBig={30} colorClass="text-slate-800"
      />
      <div className="flex justify-center gap-2 mt-4">
          {[30, 60, 90].map(m => (<button key={m} onClick={() => setStudyTime(m)} className="w-8 h-8 rounded-full border border-slate-100 text-[10px] font-bold text-slate-400 hover:bg-slate-50 touch-manipulation">{m}</button>))}
      </div>
    </div>
  );

  // 2. テスト点数入力 (タブ1) - 満点・点数切り替え＆刻み値変動
  const TestScoreAdjuster = () => {
    const isScoreMode = testInputMode === 'score';
    
    // モードによって刻み値を変更
    const stepSmall = isScoreMode ? 1 : 10;
    const stepBig = isScoreMode ? 5 : 100;
    
    const handleAdjust = (delta) => {
      if (isScoreMode) {
        setTestScore(Math.max(0, Math.min(testMax, testScore + delta)));
      } else {
        const newMax = Math.max(10, Math.min(999, testMax + delta));
        setTestMax(newMax);
        // 満点が下がって点数より小さくなったら点数も下げる
        if (newMax < testScore) setTestScore(newMax);
      }
    };

    return (
      <div className="text-center my-8 select-none">
        <div className="flex items-center justify-center gap-2 mb-4">
          {/* 点数 */}
          <div 
            onClick={() => setTestInputMode('score')}
            className={`transition-all duration-300 cursor-pointer flex flex-col items-center touch-manipulation ${isScoreMode ? 'scale-110 opacity-100' : 'scale-90 opacity-40 blur-[1px]'}`}
          >
            <span className="text-xs font-bold text-orange-500 mb-1">SCORE</span>
            <span className="text-6xl font-black text-orange-500 tabular-nums tracking-tight leading-none">{testScore}</span>
          </div>
          
          <span className="text-4xl font-light text-slate-300 mx-2">/</span>

          {/* 満点 */}
          <div 
            onClick={() => setTestInputMode('max')}
            className={`transition-all duration-300 cursor-pointer flex flex-col items-center touch-manipulation ${!isScoreMode ? 'scale-110 opacity-100' : 'scale-90 opacity-40 blur-[1px]'}`}
          >
            <span className="text-xs font-bold text-slate-500 mb-1">MAX</span>
            <span className="text-5xl font-bold text-slate-600 tabular-nums tracking-tight leading-none">{testMax}</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-2 font-bold animate-pulse">
          {isScoreMode ? '点数を入力中...' : '満点を変更中 (±10/±100)...'}
        </p>

        {/* isScoreMode の状態に応じて再レンダリングしてもボタンが消えないようにKey等は使わずPropsで制御 */}
        <ControlButtons 
          onSmallMinus={() => handleAdjust(-stepSmall)}
          onBigMinus={() => handleAdjust(-stepBig)}
          onSmallPlus={() => handleAdjust(stepSmall)}
          onBigPlus={() => handleAdjust(stepBig)}
          stepSmall={stepSmall} 
          stepBig={stepBig} 
          colorClass={isScoreMode ? "text-orange-500" : "text-slate-600"} 
        />
      </div>
    );
  };

  // 3. 偏差値入力 (タブ2)
  const ExamScoreAdjuster = () => (
    <div className="text-center my-8">
      <div className="flex items-baseline justify-center gap-1 mb-6">
        <span className="text-7xl font-black tabular-nums tracking-tight text-indigo-500">
          {examScore}
        </span>
        <span className="text-xl font-bold text-slate-400">dev</span>
      </div>
      <ControlButtons 
        onSmallMinus={() => setExamScore(Math.max(20, examScore - 1))}
        onBigMinus={() => setExamScore(Math.max(20, examScore - 5))}
        onSmallPlus={() => setExamScore(Math.min(90, examScore + 1))}
        onBigPlus={() => setExamScore(Math.min(90, examScore + 5))}
        stepSmall={1} stepBig={5} colorClass="text-indigo-500"
      />
    </div>
  );

  const GradeSelectView = () => (
    <div className="h-full bg-white flex flex-col items-center justify-center p-6 animate-in fade-in">
      <div className="mb-12 text-center">
         <div className="relative w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-sm overflow-hidden">
            <BookOpen size={50} className="text-slate-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1 right-1 p-1 bg-yellow-300 rounded-full animate-pulse-lightbulb"></div>
         </div>
         <h1 className="text-lg font-bold text-slate-800">学年を選択</h1>
      </div>
      <div className="w-full max-w-xs space-y-4">
        {SCHOOL_TYPES.map((type) => (
          <button key={type.id} onClick={() => selectGrade(type.id)} className="w-full bg-white border-2 border-slate-100 hover:border-slate-300 p-5 rounded-2xl transition-all active:scale-95 flex items-center gap-5 shadow-sm group">
            <span className="text-3xl group-hover:scale-110 transition-transform">{type.icon}</span>
            <span className="text-lg font-bold text-slate-700">{type.label}</span>
            <ChevronRight className="ml-auto text-slate-300" size={20} />
          </button>
        ))}
      </div>
    </div>
  );

  const SubjectSelectView = () => {
    const [selected, setSelected] = useState([]);
    const currentSubjects = SUBJECT_DATA[userConfig.grade] || [];
    const toggleSubject = (sub) => {
      if (selected.includes(sub)) setSelected(selected.filter(s => s !== sub));
      else setSelected([...selected, sub]);
    };

    return (
      <div className="h-full bg-white flex flex-col">
        <div className="px-6 pt-10 pb-4 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-800">科目設定</h2>
          <p className="text-xs text-slate-400 mt-1">よく使うものをタップしてください</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          {currentSubjects.map((cat) => (
            <div key={cat.category} className="mb-8">
              <h3 className="text-xs font-bold text-slate-400 mb-3 ml-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>{cat.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.items.map(item => {
                  const isActive = selected.includes(item);
                  return (
                    <button key={item} onClick={() => toggleSubject(item)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${isActive ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                      {item}
                      {isActive && <Check size={14} className="inline ml-1" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-20">
          <button onClick={() => saveConfig(selected)} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 flex justify-center items-center gap-2">OK</button>
        </div>
      </div>
    );
  };

  const MainLogView = () => {
    const TABS = [
      { id: 0, label: '勉強時間', color: 'bg-slate-800', icon: <BookOpen size={16} /> },
      { id: 1, label: 'テスト点数', color: 'bg-orange-500', icon: <Trophy size={16} /> },
      { id: 2, label: '模試偏差値', color: 'bg-indigo-500', icon: <TrendingUp size={16} /> },
    ];

    return (
      <div 
        className="h-full bg-white text-slate-800 flex flex-col relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-2 flex justify-between items-center z-10 bg-white/90 backdrop-blur-sm">
          <div className="relative">
             <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
             <input type="date" value={commonDate} onChange={(e) => setCommonDate(e.target.value)} className="pl-9 pr-3 py-2 bg-slate-50 rounded-full text-slate-600 text-sm font-bold outline-none border border-transparent focus:border-slate-200 transition-colors" />
          </div>
          <div className="flex items-center gap-2">
             {liffUserId && <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center border border-green-200"><User size={16} /></div>}
             <button onClick={handleResetConfig} className="p-2 text-slate-300 hover:text-slate-500 bg-slate-50 rounded-full"><Settings size={18} /></button>
          </div>
        </div>

        {/* タブ */}
        <div className="flex justify-center gap-2 py-2 z-10">
          {TABS.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`h-1.5 rounded-full transition-all duration-300 ${activeTab === tab.id ? `w-8 ${tab.color}` : 'w-2 bg-slate-200'}`}
            />
          ))}
        </div>
        <div className="text-center py-2 z-10">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white ${TABS[activeTab].color} shadow-md transition-colors duration-300`}>
            {TABS[activeTab].icon} {TABS[activeTab].label}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pb-32 px-5 flex flex-col justify-start pt-2">
          {/* 科目 */}
          <div className="mb-2">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {userConfig.subjects.map(sub => {
                const isActive = subject === sub;
                return (
                  <button key={sub} onClick={() => setSubject(sub)} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all duration-200 border ${isActive ? `bg-slate-800 border-slate-800 text-white shadow-lg transform scale-105 z-10` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                    {sub}
                  </button>
                );
              })}
            </div>
            {!subject && <p className="text-center text-xs text-slate-300 font-bold animate-pulse">科目をタップ</p>}
          </div>

          {/* 活動タグ */}
          <div className="mb-4">
            <div className="flex flex-wrap justify-center gap-2">
               {ACTIVITIES.map(act => {
                 const isActive = activity === act.id;
                 return (
                   <button key={act.id} onClick={() => setActivity(act.id)} className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${isActive ? `${act.color.replace('bg-', 'bg-opacity-100 bg-').replace('text-', 'text-white ')} border-transparent shadow-sm` : 'bg-white text-slate-300 border-slate-100 grayscale'}`} style={isActive ? { backgroundColor: 'var(--tw-bg-opacity)' } : {}}>
                     {act.label}
                   </button>
                 )
               })}
            </div>
          </div>

          {/* 入力エリア (タブに応じて切り替え) */}
          <div className="relative min-h-[300px]">
            {activeTab === 0 && <div className="animate-in fade-in slide-in-from-right-4 duration-300"><StudyTimeAdjuster /></div>}
            {activeTab === 1 && <div className="animate-in fade-in slide-in-from-right-4 duration-300"><TestScoreAdjuster /></div>}
            {activeTab === 2 && <div className="animate-in fade-in slide-in-from-right-4 duration-300"><ExamScoreAdjuster /></div>}
          </div>

          {/* 理解度 */}
          <div className="mb-4 px-4">
            <div className="flex justify-between max-w-xs mx-auto bg-slate-50 p-2 rounded-2xl border border-slate-100">
              {EVALUATIONS.map((ev) => {
                const active = understanding === ev.value;
                const Icon = ev.icon;
                return (
                  <button key={ev.value} onClick={() => setUnderstanding(ev.value)} className={`p-3 rounded-xl transition-all duration-200 w-full flex justify-center ${active ? 'bg-white shadow-md scale-110' : 'opacity-40 grayscale'}`}>
                    <Icon size={28} className={active ? ev.color : 'text-slate-400'} fill={active ? "currentColor" : "none"} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white to-transparent z-20">
           {errorMsg && <div className="mb-2 text-center text-xs text-red-500 font-bold animate-pulse bg-red-50 p-2 rounded-lg">{errorMsg}</div>}
          <button onClick={handleSubmit} disabled={submitState !== 'idle' || !subject} className={`w-full h-16 rounded-2xl font-bold text-lg shadow-xl flex justify-center items-center gap-2 transition-all duration-500 ${!subject ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : submitState === 'success' ? 'bg-green-500 text-white scale-105' : `${TABS[activeTab].color} text-white shadow-slate-200 active:scale-95`}`}>
            {submitState === 'idle' && <>{TABS[activeTab].label}を記録 <Check size={20} /></>}
            {submitState === 'submitting' && <span className="animate-pulse">...</span>}
            {submitState === 'success' && <Check size={32} strokeWidth={4} className="animate-bounce" />}
          </button>
        </div>
      </div>
    );
  };

  if (view === 'loading') return <div className="h-full bg-white" />;
  if (view === 'grade_select') return <GradeSelectView />;
  if (view === 'subject_select') return <SubjectSelectView />;
  return <MainLogView />;
}