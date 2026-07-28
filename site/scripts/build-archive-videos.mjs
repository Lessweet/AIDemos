/**
 * Archive 作品视频瘦身 —— 按卡片的真实显示尺寸(×3 retina)重编码。
 *
 * 为什么需要:这些是设计导出的原始素材,分辨率远超展示需要 —— 实测
 * 3DSphere-particle 存着 1290x2796 却只显示 79x185(面积 260 倍),
 * Metal 是 2160x2160 显示 223x223(94 倍)。手机上同时解 6 路这种视频,
 * 滚动就卡(2026-07-28 用户录屏,LCP 25s)。
 *
 * 目标尺寸取「CSS 显示尺寸 x3」并向上取偶数;码率交给 CRF 控制。
 * 保持 H.264:兼容性最好,而且这个量级换 H.265/AV1 收益有限、风险更大。
 *
 * 用法:node site/scripts/build-archive-videos.mjs
 * 依赖:ffmpeg
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = join(ROOT, 'docs');

/* 目标高度 = 卡片 CSS 显示高 x3(retina),偶数。数值来自线上实测,
   改版式后要重新量一次(devtools 里读 video 的 getBoundingClientRect)。 */
const JOBS = [
  { file: '3DSphere-particle_compressed.mp4', h: 556, note: '显示 79x185' },
  { file: '3DCardGlass_compressed.mp4', h: 670, note: '显示 223x223' },
  { file: 'Metal_compressed.mp4', h: 670, note: '显示 223x223' },
  { file: '3DSphere_compressed.mp4', h: 670, note: '显示 223x223' },
  { file: '3DCards_compressed.mp4', h: 670, note: '显示 223x223' },
  { file: '3DBallsIPhone_compressed.mp4', h: 1072, note: '显示 357x357' },
  { file: 'voicer_compressed.mp4', h: 670, note: '显示 223x223' },
  { file: 'voicer_card_compressed.mp4', h: 670, note: '显示 223x223' },
  { file: 'voicer_search_bar_compressed.mp4', h: 670, note: '显示 223x223' },
  { file: 'voicer_loading_compressed.mp4', h: 670, note: '显示 223x223' },
];

const CRF = 28;
let before = 0;
let after = 0;
for (const { file, h, note } of JOBS) {
  const src = join(DOCS, file);
  if (!existsSync(src)) {
    console.warn(`  跳过(不存在): ${file}`);
    continue;
  }
  const tmp = join(DOCS, `.tmp-${file}`);
  execFileSync('ffmpeg', [
    '-v', 'error', '-i', src,
    '-vf', `scale=-2:${h}`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF),
    '-pix_fmt', 'yuv420p',      // Safari 兼容
    '-an',                       // 这些卡片全是静音循环,音轨没用
    '-movflags', '+faststart',   // moov 前置,首帧更快
    tmp, '-y',
  ]);
  const b = statSync(src).size;
  const a = statSync(tmp).size;
  if (a >= b) {
    console.log(`  ${file}:压不动(${(b/1024/1024).toFixed(2)}M),保留原文件`);
    execFileSync('rm', ['-f', tmp]);
    before += b; after += b;
    continue;
  }
  renameSync(tmp, src);
  before += b;
  after += a;
  console.log(`  ${(b/1024/1024).toFixed(2)}M -> ${(a/1024/1024).toFixed(2)}M  ${file}  (${note})`);
}
console.log(`\n  合计 ${(before/1024/1024).toFixed(1)} MB -> ${(after/1024/1024).toFixed(1)} MB  (CRF ${CRF})`);
