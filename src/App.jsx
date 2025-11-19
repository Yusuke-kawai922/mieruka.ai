import React, { useState, useEffect } from 'react';
import { Settings, Check, Calendar, ChevronRight, Sparkles, Minus, Plus, Smile, Frown, Meh, ThumbsUp, Star, BookOpen } from 'lucide-react';

// --- 設定エリア ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxHGwTgRbFCbTk7XOfb3K-_kujygZER-xuFETeeHdFtGBneUEWb6K18kYIhfa9TpJ7p/exec";
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

  const [logData, setLogData] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: '',
    activity: 'self', 
    minutes: 30, 
    understanding: 3,
  });

  // --- 初期化処理 ---
  useEffect(() => {
    // 1. 設定の読み込み
    const savedConfig = localStorage.getItem('mieruka_config_final');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setUserConfig(parsed);
      setView('main');
    } else {
      setView('grade_select');
    }

    // 2. LIFFの初期化 (CDN方式で動的に読み込む)
    const script = document.createElement('script');
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    script.onload = () => {
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
              // ログインしていない場合、ログインを促す
              // window.liff.login(); 
              console.log("Not logged in");
            }
          })
          .catch((err) => {
            console.error("LIFF Init Error:", err);
          });
      }
    };
    document.body.appendChild(script);
  }, []);

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
    if (!logData.subject) return;

    setSubmitState('submitting');

    // 送信データの作成
    const payload = {
      ...logData,
      line_user_id: liffUserId || 'guest_user', // LIFF IDが取れなければゲスト扱い
      grade: userConfig.grade,
    };
    
    console.log("Sending:", payload);

    try {
      // GASへの送信
      await fetch(GAS_API_URL, {
        method: 'POST',
        mode: 'no-cors', // CORS回避
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // 成功処理
      setSubmitState('success');
      setTimeout(() => {
        setLogData(prev => ({
          ...prev,
          subject: '', 
          minutes: 30, 
          understanding: 3
        }));
        setSubmitState('idle');
      }, 1000);

    } catch (error) {
      console.error("Error:", error);
      setErrorMsg('送信に失敗しました。通信環境を確認してください。');
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

  const GradeSelectView = () => (
    <div className="h-full bg-white flex flex-col items-center justify-center p-6 animate-in fade-in">
      <div className="mb-12 text-center">
         <div className="relative w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-sm overflow-hidden">
            <BookOpen size={50} className="text-slate-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1 right-1 p-1 bg-yellow-300 rounded-full animate-pulse-lightbulb"></div>
            <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-br from-transparent via-transparent to-white opacity-20"></div>
         </div>
         <h1 className="text-lg font-bold text-slate-800">学年を選択</h1>
      </div>
      
      <div className="w-full max-w-xs space-y-4">
        {SCHOOL_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => selectGrade(type.id)}
            className="w-full bg-white border-2 border-slate-100 hover:border-slate-300 p-5 rounded-2xl transition-all active:scale-95 flex items-center gap-5 shadow-sm group"
          >
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
      if (selected.includes(sub)) {
        setSelected(selected.filter(s => s !== sub));
      } else {
        setSelected([...selected, sub]);
      }
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
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                {cat.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.items.map(item => {
                  const isActive = selected.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleSubject(item)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${
                        isActive 
                        ? 'bg-slate-800 border-slate-800 text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                      }`}
                    >
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
          <button 
            onClick={() => saveConfig(selected)}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 flex justify-center items-center gap-2"
          >
            OK
          </button>
        </div>
      </div>
    );
  };

  const MainLogView = () => {
    const adjustTime = (amount) => {
      setLogData(prev => ({
        ...prev,
        minutes: Math.max(5, Math.min(480, prev.minutes + amount))
      }));
    };

    return (
      <div className="h-full bg-white text-slate-800 flex flex-col relative">
        <div className="px-6 pt-8 pb-2 flex justify-between items-center">
          <div className="relative">
             <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
             <input 
              type="date" 
              value={logData.date}
              onChange={(e) => setLogData({...logData, date: e.target.value})}
              className="pl-9 pr-3 py-2 bg-slate-50 rounded-full text-slate-600 text-sm font-bold outline-none border border-transparent focus:border-slate-200 transition-colors"
            />
          </div>
          <button onClick={handleResetConfig} className="p-2 text-slate-300 hover:text-slate-500 bg-slate-50 rounded-full">
            <Settings size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-32 pt-2 px-5 flex flex-col justify-center min-h-[60vh]">
          
          {/* 科目 */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {userConfig.subjects.map(sub => {
                const isActive = logData.subject === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setLogData({...logData, subject: sub})}
                    className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 border-2 ${
                      isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg transform scale-105 z-10' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
            {!logData.subject && (
              <p className="text-center text-xs text-slate-300 font-bold animate-pulse">科目をタップ</p>
            )}
          </div>

          {/* 活動タグ */}
          <div className="mb-10">
            <div className="flex flex-wrap justify-center gap-2">
               {ACTIVITIES.map(act => {
                 const isActive = logData.activity === act.id;
                 return (
                   <button
                     key={act.id}
                     onClick={() => setLogData({...logData, activity: act.id})}
                     className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${
                       isActive
                       ? `${act.color.replace('bg-', 'bg-opacity-100 bg-').replace('text-', 'text-white ')} border-transparent shadow-sm scale-105`
                       : 'bg-white text-slate-400 border-slate-100 grayscale hover:grayscale-0'
                     }`}
                     style={isActive ? { backgroundColor: 'var(--tw-bg-opacity)' } : {}}
                   >
                     <span className="text-sm">{act.icon}</span>
                     {act.label}
                   </button>
                 )
               })}
            </div>
          </div>

          {/* 時間 */}
          <div className="mb-10 text-center">
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-7xl font-black text-slate-800 tabular-nums tracking-tight">
                {logData.minutes}
              </span>
              <span className="text-xl font-bold text-slate-400">min</span>
            </div>

            <div className="flex justify-center items-center gap-6">
               <button onClick={() => adjustTime(-10)} className="w-14 h-14 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors flex items-center justify-center active:scale-90 border border-slate-100">
                 <Minus size={24} />
               </button>
               
               <div className="flex gap-2">
                 {[30, 60, 90].map(m => (
                   <button key={m} onClick={() => setLogData({...logData, minutes: m})} className="w-10 h-10 rounded-full border border-slate-100 text-[10px] font-bold text-slate-400 hover:bg-slate-50 active:scale-95 transition-colors">
                     {m}
                   </button>
                 ))}
               </div>

               <button onClick={() => adjustTime(10)} className="w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg shadow-slate-200 hover:bg-slate-700 transition-colors flex items-center justify-center active:scale-90">
                 <Plus size={24} />
               </button>
            </div>
          </div>

          {/* 理解度 */}
          <div className="mb-4 px-4">
            <div className="flex justify-between max-w-xs mx-auto bg-slate-50 p-2 rounded-2xl border border-slate-100">
              {EVALUATIONS.map((ev) => {
                const active = logData.understanding === ev.value;
                const Icon = ev.icon;
                return (
                  <button
                    key={ev.value}
                    onClick={() => setLogData({...logData, understanding: ev.value})}
                    className={`p-3 rounded-xl transition-all duration-200 w-full flex justify-center ${
                      active 
                      ? 'bg-white shadow-md scale-110' 
                      : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                    }`}
                  >
                    <Icon size={28} className={active ? ev.color : 'text-slate-400'} fill={active ? "currentColor" : "none"} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white to-transparent z-20">
           {errorMsg && (
              <div className="mb-2 text-center text-xs text-red-500 font-bold animate-pulse bg-red-50 p-2 rounded-lg">
                {errorMsg}
              </div>
            )}
          <button
            onClick={handleSubmit}
            disabled={submitState !== 'idle' || !logData.subject}
            className={`w-full h-16 rounded-2xl font-bold text-lg shadow-xl flex justify-center items-center gap-2 transition-all duration-500 ${
              !logData.subject 
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : submitState === 'success'
                  ? 'bg-emerald-500 text-white scale-105 shadow-emerald-200' 
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200 active:scale-95'
            }`}
          >
            {submitState === 'idle' && (
              <Check size={28} />
            )}
            {submitState === 'submitting' && (
              <span className="animate-pulse">...</span>
            )}
            {submitState === 'success' && (
              <Check size={32} strokeWidth={4} className="animate-bounce" />
            )}
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