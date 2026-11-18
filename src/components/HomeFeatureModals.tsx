import React, { useState } from 'react';
import {
  ALL_DECOR_CATEGORIES,
  DecorCategory,
  DECOR_CATALOG,
  DECOR_SUBSETS_CATALOG,
  DeGuaCreature,
  DeGuaVariety,
  MIN_SQUAD_BY_MUSHROOM_SIZE,
  MUSHROOM_CATALOG,
  PetalColor,
  PETAL_META,
  PostcardItem,
  PrivacyZoneSetting,
  VARIETY_CATALOG
} from '../types/game';
import { DeGuaCharacter } from './DeGuaCharacter';
import { buildAuthenticPikminMushroomSvg } from './PikminMushroomVisual';

const ALL_VARIETIES: DeGuaVariety[] = ['red', 'yellow', 'blue', 'purple', 'white', 'winged', 'rock'];

/* ==================== 共通頂部返回主畫面標題列 ==================== */
const ModalHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void }> = ({
  title,
  subtitle,
  onClose
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottom: '1.5px solid #E2E8F0'
    }}
  >
    <button
      onClick={onClose}
      style={{
        border: 'none',
        background: '#1E293B',
        color: '#FFFFFF',
        borderRadius: 99,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 900,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}
    >
      <span>←</span>
      <span>返回主畫面</span>
    </button>

    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{subtitle}</div>}
    </div>
  </div>
);

/* ==================== 1. 🎖️ 飾品一覽 (Decor Collection Modal) ==================== */
export const DecorCollectionModal: React.FC<{
  creatures: DeGuaCreature[];
  onClose: () => void;
}> = ({ creatures, onClose }) => {
  const decoratedCreatures = creatures.filter((c) => c.hasDecor);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFBEB',
          borderRadius: '32px 32px 0 0',
          height: '88%',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto'
        }}
      >
        <ModalHeader
          title="🎖️ 飾品一覽"
          subtitle={`已收集 ${decoratedCreatures.length} 隻飾品地瓜球`}
          onClose={onClose}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {ALL_DECOR_CATEGORIES.map((decorKey) => {
            const dMeta = DECOR_CATALOG[decorKey];
            const sets = DECOR_SUBSETS_CATALOG[decorKey] || [];
            return (
              <div
                key={decorKey}
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #FDE68A',
                  borderRadius: 22,
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#78350F' }}>
                    {dMeta.icon} {dMeta.placeCategory} — 【{dMeta.name}】
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#B45309' }}>
                    {sets.length} 系列
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sets.map((subSet) => {
                    const setVarieties = subSet.varieties || ALL_VARIETIES;
                    return (
                      <div key={subSet.setId}>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: subSet.isRare ? '#D97706' : '#64748B', marginBottom: 6, textAlign: 'center' }}>
                          {subSet.emoji} {subSet.setName}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                          {setVarieties.map((v) => {
                            const unlocked = decoratedCreatures.some(
                              (c) =>
                                c.decor === decorKey &&
                                c.variety === v &&
                                (!c.decorSetId || c.decorSetId === subSet.setId || !subSet.isRare)
                            );
                            return (
                              <div
                                key={`${subSet.setId}_${v}`}
                                style={{
                                  background: unlocked ? '#FEF3C7' : '#F8FAFC',
                                  border: unlocked ? '1.5px solid #F59E0B' : '1px dashed #CBD5E1',
                                  borderRadius: 14,
                                  padding: '6px 2px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  filter: unlocked ? 'none' : 'grayscale(1)',
                                  opacity: unlocked ? 1 : 0.34
                                }}
                              >
                                <DeGuaCharacter
                                  variety={v}
                                  decor={decorKey}
                                  leafStage="flower"
                                  flowerColor="yellow"
                                  showDecor={true}
                                  isBouncing={false}
                                  size={36}
                                />
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#334155', marginTop: 2 }}>
                                  {VARIETY_CATALOG[v].name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== 2. ➿ 好友與同步世界 (Friends & World Sync Modal) ==================== */
export const FriendsAndWorldModal: React.FC<{
  playerName: string;
  worldKey: string;
  cloudUrl: string;
  postcards: PostcardItem[];
  onChangePlayerName: (v: string) => void;
  onChangeWorldKey: (v: string) => void;
  onChangeCloudUrl: (v: string) => void;
  onClose: () => void;
}> = ({
  playerName,
  worldKey,
  cloudUrl,
  postcards,
  onChangePlayerName,
  onChangeWorldKey,
  onChangeCloudUrl,
  onClose
}) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#F0FDF4',
          borderRadius: '32px 32px 0 0',
          height: '88%',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto'
        }}
      >
        <ModalHeader
          title="➿ 好友與共同世界"
          subtitle="兩支 iPhone 共用同一張世界地圖的大花、蘑菇與花海"
          onClose={onClose}
        />

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 22,
            padding: '14px 16px',
            border: '2px solid #86EFAC',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: '#166534' }}>
            🌍 世界同步設定（只要兩個人世界代號相同，隨時打開都看到相同的蘑菇、大花與花海）
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>共同世界代號</label>
            <input
              value={worldKey}
              onChange={(e) => onChangeWorldKey(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 12,
                border: '1.5px solid #86EFAC',
                fontWeight: 800,
                marginTop: 4
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>
              雲端同步資料庫網址（選填免費 Firebase Realtime DB URL，供兩支手機跨外網同步花海與打菇血量）
            </label>
            <input
              placeholder="https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app"
              value={cloudUrl}
              onChange={(e) => onChangeCloudUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 12,
                border: '1.5px solid #CBD5E1',
                fontSize: 12,
                marginTop: 4
              }}
            />
          </div>
        </div>

        {/* 紀念明信片冊 */}
        <div style={{ fontSize: 15, fontWeight: 900, color: '#0F172A' }}>
          💌 蘑菇挑戰紀念明信片 ({postcards.length})
        </div>

        {postcards.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: '22px',
              textAlign: 'center',
              color: '#94A3B8',
              fontWeight: 800,
              fontSize: 12
            }}
          >
            點擊地圖上的蘑菇據點參加挑戰，就能獲得該地標的紀念明信片與好友分享！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {postcards.map((pc) => (
              <div
                key={pc.id}
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #FDE047',
                  borderRadius: 20,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>
                    📍 {pc.placeName}
                  </div>
                  <div style={{ fontSize: 11, color: '#D97706', fontWeight: 800 }}>
                    {'⭐'.repeat(pc.stars)} ・ {pc.senderName || playerName} ・ {pc.createdAt}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {pc.creatures.map((c, idx) => (
                    <DeGuaCharacter
                      key={idx}
                      variety={c.variety}
                      decor={c.decor}
                      leafStage="flower"
                      flowerColor="red"
                      showDecor={c.hasDecor}
                      size={44}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ==================== 3. 📢 通知與活動公告 (Notifications Modal) ==================== */
export const NotificationsModal: React.FC<{
  logs: string[];
  onTestIosNotification: () => void;
  onClose: () => void;
}> = ({ logs, onTestIosNotification, onClose }) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFBEB',
          borderRadius: '32px 32px 0 0',
          height: '82%',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto'
        }}
      >
        <ModalHeader
          title="📢 通知與活動公告"
          subtitle="最新消息與散步拔苗紀錄"
          onClose={onClose}
        />

        <div
          style={{
            background: '#FFFFFF',
            border: '2px solid #FCD34D',
            borderRadius: 20,
            padding: '14px'
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, color: '#B45309' }}>
            🎉 本月活動：台灣夜市與手搖飲飾品地瓜球登場！
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
            散步時開啟「種花模式」可享花苗培育速度 1.2 倍加成！當 iPhone 放口袋走滿步數時，系統會在背景自動跳出通知提醒你拔出地瓜球！
          </div>
          <button
            onClick={onTestIosNotification}
            style={{
              marginTop: 10,
              width: '100%',
              border: 'none',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#FFF',
              fontWeight: 900,
              fontSize: 13,
              padding: '10px',
              borderRadius: 99,
              cursor: 'pointer'
            }}
          >
            🔔 授權 / 測試 iPhone 拔苗推播通知
          </button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 900, color: '#78350F' }}>
          📋 近期散步動態紀錄
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: '#334155',
                border: '1px solid #FDE68A'
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ==================== 4. 🙂 每日紀錄 (Daily Lifelog Modal) ==================== */
export const DailyLifelogModal: React.FC<{
  todaySteps: number;
  dailyMoods: Record<number, string>;
  onSelectMoodToday: (emoji: string, note: string) => void;
  onClose: () => void;
}> = ({ todaySteps, dailyMoods, onSelectMoodToday, onClose }) => {
  const [note, setNote] = useState('今天帶著地瓜球小隊出門散步種花！');
  const moods = [
    { emoji: '😊', label: '開心' },
    { emoji: '🥰', label: '充實' },
    { emoji: '😎', label: '活力' },
    { emoji: '😌', label: '悠閒' },
    { emoji: '🧋', label: '喝珍奶' }
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFBEB',
          borderRadius: '32px 32px 0 0',
          height: '80%',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto'
        }}
      >
        <ModalHeader
          title="🙂 每日紀錄 (Lifelog)"
          subtitle="回顧每天的散步步數與心情"
          onClose={onClose}
        />

        <div
          style={{
            background: '#FFFFFF',
            border: '2px solid #F59E0B',
            borderRadius: 22,
            padding: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#B45309' }}>今日散步成果</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
            {todaySteps.toLocaleString()} 步
          </div>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, marginBottom: 12 }}>
            選擇今天的心情印章（打卡可獲得 +10 滴黃色花蜜獎勵！）：
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            {moods.map((m) => (
              <button
                key={m.emoji}
                onClick={() => onSelectMoodToday(m.emoji, note)}
                style={{
                  border: '2px solid #FDE68A',
                  background: '#FEF3C7',
                  borderRadius: 16,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <span style={{ fontSize: 26 }}>{m.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#92400E' }}>{m.label}</span>
              </button>
            ))}
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="寫下一句今天的散步日記..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1.5px solid #E2E8F0',
              fontSize: 13,
              fontWeight: 700
            }}
          />
        </div>

        <div style={{ fontSize: 13, fontWeight: 900, color: '#78350F' }}>
          📅 本週心情印章紀錄 ({Object.keys(dailyMoods).length} / 7 天)
        </div>
      </div>
    </div>
  );
};

/* ==================== 5. 🛍️ 商店 (Shop Modal) ==================== */
export const ShopModal: React.FC<{
  coins: number;
  onBuyItem: (
    cost: number,
    rewardType: 'petals' | 'nectar' | 'radar' | 'seedling' | 'extra_slot_std' | 'extra_slot_fast25'
  ) => void;
  onClose: () => void;
}> = ({ coins, onBuyItem, onClose }) => {
  const shopItems = [
    {
      id: 'petals',
      icon: '🌼',
      name: '四色花瓣滿滿補給包',
      desc: '白、黃、紅、藍四色花瓣各 +100 片',
      cost: 50,
      type: 'petals' as const
    },
    {
      id: 'nectar',
      icon: '🍯',
      name: '特級花蜜禮盒',
      desc: '四色花蜜各 +30 滴，瞬間餵飽全隊',
      cost: 40,
      type: 'nectar' as const
    },
    {
      id: 'extra_slot_std',
      icon: '🔵',
      name: '青藍額外欄位 ×1',
      desc: '增加 1 口油鍋欄位同時炸瓜糰，撈起地瓜球後消耗',
      cost: 60,
      type: 'extra_slot_std' as const
    },
    {
      id: 'extra_slot_fast25',
      icon: '🟡⚡',
      name: '金黃加速 +25% 額外欄位 ×1',
      desc: '增加 1 口 +25% 成長步數加速的黃金油鍋，撈起後消耗',
      cost: 100,
      type: 'extra_slot_fast25' as const
    },
    {
      id: 'radar',
      icon: '📡',
      name: '立即發射超級探測器',
      desc: '立即掃描周邊店家並獲得水果與瓜糰探險',
      cost: 0,
      type: 'radar' as const
    },
    {
      id: 'seedling',
      icon: '🍠✨',
      name: '黃金特殊飾品巨大瓜糰',
      desc: '直接獲得 1 顆自帶飾品的特殊瓜糰',
      cost: 80,
      type: 'seedling' as const
    }
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFBEB',
          borderRadius: '32px 32px 0 0',
          height: '84%',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto'
        }}
      >
        <ModalHeader
          title="🛍️ 商店"
          subtitle={`目前持有金幣：💰 ${coins} 枚（散步種花可自動獲得金幣）`}
          onClose={onClose}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shopItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#FFFFFF',
                border: '2px solid #FDE68A',
                borderRadius: 22,
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, marginTop: 2 }}>
                    {item.desc}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onBuyItem(item.cost, item.type)}
                style={{
                  border: 'none',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#FFF',
                  fontWeight: 900,
                  fontSize: 12,
                  padding: '10px 16px',
                  borderRadius: 99,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.cost === 0 ? '免費領取' : `💰 ${item.cost}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ==================== 6. 🧑‍🌾 個人資訊與主選單 (Profile & Main Menu Modal) ==================== */
export const ProfileAndMenuModal: React.FC<{
  playerName: string;
  level: number;
  todaySteps: number;
  coins: number;
  creaturesCount: number;
  petalJar: Record<PetalColor, number>;
  nectarJar: Record<PetalColor, number>;
  privacyZone?: PrivacyZoneSetting;
  onChangePrivacyZone?: (next: PrivacyZoneSetting) => void;
  onChangePlayerName: (v: string) => void;
  onSimulateWalkSteps: (steps: number) => void;
  onOpenSubModal: (target: 'decor' | 'friends' | 'planter' | 'expeditions' | 'garden' | 'shop' | 'guide') => void;
  onClose: () => void;
}> = ({
  playerName,
  level,
  todaySteps,
  coins,
  creaturesCount,
  petalJar,
  nectarJar,
  privacyZone,
  onChangePrivacyZone,
  onChangePlayerName,
  onSimulateWalkSteps,
  onOpenSubModal,
  onClose
}) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#F8FAFC',
          borderRadius: '32px 32px 0 0',
          height: '86%',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto'
        }}
      >
        <ModalHeader
          title="🧑‍🌾 個人資訊與主選單"
          subtitle={`Lv.${level} ・ 總地瓜球夥伴 ${creaturesCount} 隻`}
          onClose={onClose}
        />

        {/* 玩家名片卡 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
            border: '2px solid #34D399',
            borderRadius: 24,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '3px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34
            }}
          >
            🧑‍🌾
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: '#0EA5E9',
                  color: '#FFF',
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: 99
                }}
              >
                Lv.{level}
              </span>
              <input
                value={playerName}
                onChange={(e) => onChangePlayerName(e.target.value)}
                style={{
                  border: '1px solid #10B981',
                  background: '#FFFFFF',
                  borderRadius: 8,
                  padding: '4px 8px',
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#0F172A',
                  width: 150
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#065F46', fontWeight: 800, marginTop: 6 }}>
              👣 今日步數：{todaySteps.toLocaleString()} 步 ｜ 💰 金幣：{coins}
            </div>
          </div>
        </div>

        {/* 庫存總覽 */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '12px 14px',
            border: '1.5px solid #E2E8F0'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: '#475569', marginBottom: 8 }}>
            🎒 花蜜與花瓣庫存一覽
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {(['white', 'yellow', 'red', 'blue'] as PetalColor[]).map((c) => (
              <div
                key={c}
                style={{
                  background: '#F8FAFC',
                  borderRadius: 12,
                  padding: '6px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 16 }}>{PETAL_META[c].emoji}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#334155' }}>
                  瓣 {petalJar[c]} / 蜜 {nectarJar[c]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 主選單快捷鍵 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: '😗 口哨花園', key: 'garden' as const },
            { label: '🍳 油鍋拔苗', key: 'planter' as const },
            { label: '🍎 探險隊', key: 'expeditions' as const },
            { label: '🎖️ 飾品一覽', key: 'decor' as const },
            { label: '➿ 好友與世界', key: 'friends' as const },
            { label: '🛍️ 商店補給', key: 'shop' as const },
            { label: '📖 蘑菇與打菇說明', key: 'guide' as const }
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => onOpenSubModal(btn.key)}
              style={{
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                borderRadius: 18,
                padding: '14px 8px',
                fontWeight: 900,
                fontSize: 13,
                color: '#1E293B',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* 隱私區域保護設定（半徑 50~300m 不留花朵軌跡，花瓣消耗與油鍋加速不變） */}
        {privacyZone && onChangePrivacyZone && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '12px 14px',
              border: '1.5px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, fontWeight: 900, color: '#0F172A' }}>
                🛡️ 種花隱私區域（{privacyZone.radiusMeters} 公尺內不顯示花朵）
              </span>
              <button
                onClick={() =>
                  onChangePrivacyZone({ ...privacyZone, enabled: !privacyZone.enabled })
                }
                style={{
                  border: 'none',
                  borderRadius: 99,
                  padding: '4px 12px',
                  fontSize: 11.5,
                  fontWeight: 900,
                  cursor: 'pointer',
                  background: privacyZone.enabled ? '#10B981' : '#CBD5E1',
                  color: '#FFFFFF'
                }}
              >
                {privacyZone.enabled ? '已開啟' : '已關閉'}
              </button>
            </div>
            {privacyZone.enabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range"
                  min={50}
                  max={300}
                  step={25}
                  value={privacyZone.radiusMeters}
                  onChange={(e) =>
                    onChangePrivacyZone({
                      ...privacyZone,
                      radiusMeters: Number(e.target.value)
                    })
                  }
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#475569' }}>
                  {privacyZone.radiusMeters}m
                </span>
              </div>
            )}
          </div>
        )}

        {/* 室內測試步數模擬按鈕 */}
        <div
          style={{
            background: '#FEF3C7',
            borderRadius: 18,
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: '#92400E' }}>
            👟 室內測試工具：模擬走路增加步數
          </span>
          <button
            onClick={() => onSimulateWalkSteps(300)}
            style={{
              border: 'none',
              background: '#D97706',
              color: '#FFF',
              fontWeight: 900,
              fontSize: 12,
              padding: '8px 14px',
              borderRadius: 99,
              cursor: 'pointer'
            }}
          >
            +300 步
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 7. 📖 主畫面「蘑菇種類、血量與打菇規則說明」Modal ==================== */
export const MushroomGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.58)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#F8FAFC',
          borderRadius: '32px 32px 0 0',
          height: '88%',
          padding: '20px 18px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto'
        }}
      >
        <ModalHeader
          title="📖 蘑菇圖鑑與打菇戰力說明"
          subtitle="《Pikmin Bloom》完整蘑菇種類、血量、相剋加分與耗時公式"
          onClose={onClose}
        />

        {/* 1. 種類與最低所需隻數 */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '14px',
            border: '1.5px solid #E2E8F0'
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0F172A', marginBottom: 6 }}>
            🍄 一、蘑菇分類與最低上場隻數
          </div>
          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.65, fontWeight: 700 }}>
            • <b>顏色菇（乾爽的菇）</b>：分為 <b>小 / 一般 / 大</b><br />
            • <b>元素菇（外圍多一層物質）</b>：分為 <b>一般 / 大</b>，僅限對應屬性地瓜球上場<br />
            • <b>最低所需上場數量</b>：大 →{' '}
            {MIN_SQUAD_BY_MUSHROOM_SIZE['大']} 隻 ／ 一般 →{' '}
            {MIN_SQUAD_BY_MUSHROOM_SIZE['一般']} 隻 ／ 小 → {MIN_SQUAD_BY_MUSHROOM_SIZE['小']} 隻
          </div>
        </div>

        {/* 2. 戰力公式與時間公式 */}
        <div
          style={{
            background: '#FFFBEB',
            borderRadius: 20,
            padding: '14px',
            border: '1.5px solid #FDE68A'
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 900, color: '#92400E', marginBottom: 6 }}>
            ⚡ 二、打菇戰力（工作力）5 項加總 & 耗時公式
          </div>
          <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.65, fontWeight: 700 }}>
            1. <b>種類基礎</b>：紅 4 / 黃 3 / 藍 3 / 紫 6 / 白 2 / 粉 2 / 灰(岩石) 5<br />
            2. <b>飾品加成</b>：有飾品 +4 ／ 無飾品 +0<br />
            3. <b>頭頂花朵</b>：葉子 1 / 花苞 2 / 普通花 3 / 當月副花 4 / 當月主花 5 / 禿了 0<br />
            4. <b>友好愛心</b>：&lt;1心 0 ／ 1~4 紅心 +1~4 ／ 1~4 金心 +8, 12, 16, 20<br />
            5. <b>打什麼菇</b>：同色 +12、非相剋 +3、相剋 0；元素菇對應色 +100；當月新活動飾品打活動菇 +300<br />
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#FFFFFF', borderRadius: 10, color: '#15803D' }}>
              ⏱️ 耗時（分鐘）＝（蘑菇血量 ÷ 總攻擊強度 × 100）÷ 60
            </div>
          </div>
        </div>

        {/* 3. 全 13 種蘑菇血量與相剋資料庫（雙人版排除活動輝煌蘑菇） */}
        <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0F172A' }}>
          📊 三、全部 13 種蘑菇血量與相剋表
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.values(MUSHROOM_CATALOG)
            .filter((item) => item.element !== 'bizarre')
            .map((item) => {
            const sampleSize = item.availableSizes[0];
            const miniSvg = buildAuthenticPikminMushroomSvg(
              item.element,
              sampleSize,
              `guide_${item.element}`
            );
            return (
              <div
                key={item.element}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '10px 12px',
                  border: '1.5px solid #E2E8F0',
                  borderLeft: `5px solid ${item.colorHex}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div style={{ width: 64, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <div style={{ transform: 'scale(0.5)', transformOrigin: 'center' }} dangerouslySetInnerHTML={{ __html: miniSvg }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 900, color: '#0F172A' }}>
                      {item.typeLabel}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#64748B' }}>
                      {item.categoryLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 900, color: '#EF4444', marginTop: 2 }}>
                    {item.availableSizes
                      .map((s) => `${s} ${(item.hpBySize[s] || 0).toLocaleString()}`)
                      .join(' ／ ')}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginTop: 2 }}>
                    {item.advantageDesc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
