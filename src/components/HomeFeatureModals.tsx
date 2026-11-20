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
  VARIETY_CATALOG
} from '../types/game';
import { DeGuaCharacter } from './DeGuaCharacter';
import { buildAuthenticPikminMushroomSvg } from './PikminMushroomVisual';
import { WalkingPlayerAvatar } from './WalkingPlayerAvatar';

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
          subtitle="最新消息與散步起鍋紀錄"
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
            散步時開啟「種花模式」可享瓜糰油炸速度 1.2 倍加成！當 iPhone 放口袋走滿步數時，系統會在背景自動跳出通知提醒你起鍋地瓜球！
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
            🔔 授權 / 測試 iPhone 起鍋推播通知
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

/* ==================== 5. 🛍️ 商店 (Shop Modal + 每日免費禮物) ==================== */
export const ShopModal: React.FC<{
  coins: number;
  canClaimDailyGift: boolean;
  onClaimDailyGift: () => void;
  onBuyItem: (
    cost: number,
    rewardType: 'petals' | 'nectar' | 'radar' | 'seedling' | 'extra_slot_std' | 'extra_slot_fast25'
  ) => void;
  onClose: () => void;
}> = ({ coins, canClaimDailyGift, onClaimDailyGift, onBuyItem, onClose }) => {
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

        {/* 每日免費禮物區塊（每天凌晨 0:00 重置；領取後主畫面商店恢復純白卡片） */}
        <div
          style={{
            background: canClaimDailyGift
              ? 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 52%, #FEF08A 100%)'
              : '#F1F5F9',
            border: canClaimDailyGift ? '2px solid #10B981' : '1.5px solid #E2E8F0',
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
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                boxShadow: '0 3px 8px rgba(0,0,0,0.08)'
              }}
            >
              🎁
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#065F46' }}>
                每日免費禮物
              </div>
              <div style={{ fontSize: 11, color: '#047857', fontWeight: 700, marginTop: 2 }}>
                {canClaimDailyGift
                  ? '每天凌晨 00:00 更新！內含四色花瓣與花蜜補給'
                  : '今日禮物已領取（明天凌晨 00:00 再來領！）'}
              </div>
            </div>
          </div>

          <button
            onClick={onClaimDailyGift}
            disabled={!canClaimDailyGift}
            style={{
              border: 'none',
              background: canClaimDailyGift
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : '#CBD5E1',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: 12,
              padding: '10px 16px',
              borderRadius: 99,
              cursor: canClaimDailyGift ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {canClaimDailyGift ? '免費領取' : '已領取'}
          </button>
        </div>

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

/* ==================== 6. ☰ 主選單（完全對照皮克敏圖五簡潔毛玻璃雙欄卡片選單） ==================== */
export type MainMenuSubTarget =
  | 'shop'
  | 'garden'
  | 'planter'
  | 'postcards'
  | 'lifelog'
  | 'expeditions'
  | 'guide'
  | 'friends'
  | 'settings';

export const ProfileAndMenuModal: React.FC<{
  playerName: string;
  level: number;
  onOpenSubModal: (target: MainMenuSubTarget) => void;
  onClose: () => void;
}> = ({ playerName, level, onOpenSubModal, onClose }) => {
  const menuCards: Array<{
    key: MainMenuSubTarget;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: 'garden', label: '地瓜球', icon: '🍠' },
    { key: 'planter', label: '瓜糰', icon: '🍯' },
    { key: 'postcards', label: '明信片', icon: '🖼️' },
    { key: 'lifelog', label: '每日紀錄', icon: '📔' },
    { key: 'expeditions', label: '探險與蘑菇', icon: '🍄' },
    { key: 'guide', label: '遊玩指南', icon: '📖' },
    { key: 'friends', label: '好友與世界', icon: '👥' },
    { key: 'settings', label: '設定', icon: '⚙️' }
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.24)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 16px calc(max(24px, env(safe-area-inset-bottom)) + 74px)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10
        }}
      >
        {/* 玩家名片（對照圖五左一） */}
        <button
          onClick={() => onOpenSubModal('settings')}
          style={{
            background: '#FFFFFF',
            border: 'none',
            borderRadius: 18,
            padding: '10px 12px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.14)'
          }}
        >
          <WalkingPlayerAvatar height={28} isWalking={false} />
          <span
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #B45309)',
              color: '#FFF',
              fontSize: 11,
              fontWeight: 900,
              padding: '2px 7px',
              borderRadius: 99,
              flexShrink: 0
            }}
          >
            Lv.{level}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#1E293B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {playerName}
          </span>
        </button>

        {/* 商店（對照圖五右一） */}
        <button
          onClick={() => onOpenSubModal('shop')}
          style={{
            background: '#FFFFFF',
            border: 'none',
            borderRadius: 18,
            padding: '10px 14px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.14)'
          }}
        >
          <span style={{ fontSize: 22 }}>🛍️</span>
          <span style={{ fontSize: 14.5, fontWeight: 900, color: '#1E293B' }}>商店</span>
        </button>

        {/* 功能入口（點進去開各自子功能頁面） */}
        {menuCards.map((item) => (
          <button
            key={item.key}
            onClick={() => onOpenSubModal(item.key)}
            style={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 18,
              padding: '10px 14px',
              height: 54,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.14)'
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 14.5, fontWeight: 900, color: '#1E293B' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 左下角：圓形 ✕ 返回主畫面按鈕（對照圖五左下角） */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          left: 16,
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          width: 54,
          height: 54,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.78)',
          background: 'radial-gradient(circle at 30% 30%, rgba(52,211,153,0.9), rgba(5,150,105,0.92))',
          color: '#FFFFFF',
          fontSize: 20,
          fontWeight: 900,
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="關閉選單"
      >
        ✕
      </button>
    </div>
  );
};

/* ==================== 6B. 🖼️ 明信片子頁面 ==================== */
export const PostcardsModal: React.FC<{
  postcards: PostcardItem[];
  onClose: () => void;
}> = ({ postcards, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1050,
      background: 'rgba(15, 23, 42, 0.52)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: '#FFFBEB',
        borderRadius: '30px 30px 0 0',
        height: '82lvh',
        padding: '20px 18px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto'
      }}
    >
      <ModalHeader title="🖼️ 明信片" subtitle={`共收藏 ${postcards.length} 張`} onClose={onClose} />
      {postcards.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '28px 18px',
            textAlign: 'center',
            color: '#64748B',
            fontWeight: 800,
            fontSize: 13
          }}
        >
          還沒有明信片，快去地圖打蘑菇帶回各地地標明信片吧！
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
                <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>
                  📍 {pc.placeName}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#D97706', marginTop: 2 }}>
                  {'⭐'.repeat(pc.stars)} ・ {pc.mushroomName} ・ {pc.createdAt}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {pc.creatures.slice(0, 3).map((cr, idx) => (
                  <DeGuaCharacter
                    key={idx}
                    variety={cr.variety}
                    decor={cr.decor}
                    leafStage="flower"
                    flowerColor="yellow"
                    showDecor={cr.hasDecor}
                    isBouncing={false}
                    size={32}
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

/* ==================== 6C. ⚙️ 設定子頁面（乾淨簡潔，無多餘項目） ==================== */
export const SettingsModal: React.FC<{
  playerName: string;
  level: number;
  todaySteps: number;
  coins: number;
  onChangePlayerName: (v: string) => void;
  onRequestPermissions: () => void;
  onClose: () => void;
}> = ({ playerName, level, todaySteps, coins, onChangePlayerName, onRequestPermissions, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1050,
      background: 'rgba(15, 23, 42, 0.52)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: '#F8FAFC',
        borderRadius: '30px 30px 0 0',
        height: '76lvh',
        padding: '20px 18px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto'
      }}
    >
      <ModalHeader title="⚙️ 設定" subtitle={`Lv.${level} ・ 今日 ${todaySteps.toLocaleString()} 步 ・ 💰${coins}`} onClose={onClose} />

      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '16px',
          border: '1.5px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>玩家暱稱</div>
        <input
          value={playerName}
          onChange={(e) => onChangePlayerName(e.target.value)}
          style={{
            border: '1.5px solid #CBD5E1',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 14,
            fontWeight: 800,
            color: '#0F172A'
          }}
        />
      </div>

      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '16px',
          border: '1.5px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>iPhone 定位與計步權限</div>
        <div style={{ fontSize: 12, color: '#475569', fontWeight: 700, lineHeight: 1.55 }}>
          若要鎖螢幕時也在背景種花，請到 iPhone「設定 → 地瓜球 → 位置」將「使用 App 期間」改為「永遠」，並確認「動作與健身」及「通知」已開啟。
        </div>
        <button
          onClick={onRequestPermissions}
          style={{
            border: 'none',
            background: '#10B981',
            color: '#FFFFFF',
            borderRadius: 99,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          📍 檢查 / 請求授權
        </button>
      </div>
    </div>
  </div>
);

/* ==================== 6D. 📷 AR 相機拍照子頁面 ==================== */
export const ARCameraModal: React.FC<{
  squadCreatures: DeGuaCreature[];
  onClose: () => void;
}> = ({ squadCreatures, onClose }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1090,
        background: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden'
      }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="AR 背景"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #93C5FD 0%, #DCFCE7 55%, #4ADE80 100%)'
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          padding: 'var(--top-safe-hud) 16px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            background: 'rgba(15,23,42,0.52)',
            color: '#FFFFFF',
            borderRadius: 99,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 900
          }}
        >
          📷 地瓜球 AR 相機
        </div>
        <button
          onClick={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.75)',
            background: 'rgba(15,23,42,0.5)',
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* 前景可愛地瓜球小隊合影 */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 6,
          paddingBottom: 20
        }}
      >
        {squadCreatures.slice(0, 6).map((c) => (
          <DeGuaCharacter
            key={c.id}
            variety={c.variety}
            decor={c.decor}
            leafStage={c.leafStage}
            flowerColor={c.flowerColor}
            showDecor={c.hasDecor}
            size={62}
            isBouncing={true}
          />
        ))}
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          padding: '0 20px max(26px, env(safe-area-inset-bottom))',
          display: 'flex',
          justifyContent: 'center',
          gap: 12
        }}
      >
        <label
          style={{
            background: '#FFFFFF',
            color: '#0F172A',
            borderRadius: 99,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,0.28)'
          }}
        >
          📸 拍攝環境照片合影
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPhotoUrl(URL.createObjectURL(f));
              }
            }}
          />
        </label>
      </div>
    </div>
  );
};

/* ==================== 6E. 🏃 參加活動子頁面 ==================== */
export const ActivityEventsModal: React.FC<{
  todaySteps: number;
  mushroomsDestroyed: number;
  missionTarget: number;
  onClaimMission: () => void;
  onClose: () => void;
}> = ({ todaySteps, mushroomsDestroyed, missionTarget, onClaimMission, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1050,
      background: 'rgba(15, 23, 42, 0.52)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: '#F8FAFC',
        borderRadius: '30px 30px 0 0',
        height: '76lvh',
        padding: '20px 18px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto'
      }}
    >
      <ModalHeader title="🏃 參加活動" subtitle="每週散步挑戰與每月飾品活動" onClose={onClose} />
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: 16,
          border: '1.5px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>
          👟 每週目標：累積 30,000 步散步挑戰
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
          今日所在時區步數：{todaySteps.toLocaleString()} 步（每日凌晨 00:00 自動歸零重算）
        </div>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: 16,
          border: '1.5px solid #FDE68A',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 900, color: '#78350F' }}>
          🍄 目前活動任務：摧毀 {missionTarget} 朵蘑菇（{mushroomsDestroyed}/{missionTarget}）
        </div>
        <button
          onClick={onClaimMission}
          style={{
            border: 'none',
            background: mushroomsDestroyed >= missionTarget ? '#22C55E' : '#F59E0B',
            color: '#FFFFFF',
            borderRadius: 99,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          {mushroomsDestroyed >= missionTarget ? '🎁 領取獎勵！' : '查看附近蘑菇'}
        </button>
      </div>
    </div>
  </div>
);

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
