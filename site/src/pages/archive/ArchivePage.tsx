/**
 * Archive 页(docs/archive.html 的 React 版)。四个分区 + 16 张作品卡逐节点转录;
 * hover 蒙层(card-overlay)与区头拆字直接在 JSX 渲染(替代旧版运行时注入,产物 DOM 一致);
 * icon 模态用 portal 挂到 body(保持旧版 DOM 位置:模态是 main 的兄弟节点)。
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import HeadingRise from '../../shared/HeadingRise';
import PageTitle, { RISE_CHAR_STEP } from '../../shared/PageTitle';
import PageCollapse from '../../shared/PageCollapse';
import { PIXEL_PATHS } from './pixelIcons';
import { CoverIframe, CoverVideo } from '../../shared/covers';
import {
  useStickyMenu,
  useScrollProgress,
  useNavSolidOnScroll,
  useNavSpy,
  usePillarEntrance,
  useCoverFade,
  useDynamicScale,
  useSmoothScrollAnchors,
  useHeaderAlwaysVisible,
  useHideNavOnScrollMobile,
  useAppReady,
  usePauseOffscreenMedia,
} from '../../shared/hooks';

const PixelIcon = ({ d }: { d: string }) => (
  <span className="menu-icon">
    <svg viewBox="0 0 24 24">
      <path fillRule="evenodd" d={d} />
    </svg>
  </span>
);

const HeadingIcon = ({ d }: { d: string }) => (
  <span className="heading-icon">
    <svg viewBox="0 0 24 24">
      <path fillRule="evenodd" d={d} />
    </svg>
  </span>
);

/* 卡片文字信息区:DOM 与原手写结构逐类名一致,8 处重复收敛为一个组件 */
function CardInfo(props: { label: string; tag?: string; date: string }) {
  return (
    <div className="card-info">
      <div className="card-title-row">
        <h3 className="card-label">{props.label}</h3>

      </div>
      <div className="card-meta">
        {props.tag && <span className="card-tag">{props.tag}</span>}
        <span className="card-date">{props.date}</span>
      </div>
    </div>
  );
}

/* 视频作品卡(card-tall 系列):cardClass 区分 video-full / gray-outline / scaled 变体 */
function VideoCard(props: {
  delay: number;
  group: string;
  category: string;
  cardClass: string;
  src: string;
  label: string;
  tag: string;
  date: string;
  iphone?: boolean;
  dynamicScale?: { contentHeight: number; contentType?: string };
}) {
  const p = props;
  return (
    <div className="card-wrapper" data-delay={p.delay} data-group={p.group} data-category={p.category}>
      <article
        className={p.cardClass}
        data-content-height={p.dynamicScale?.contentHeight}
        data-content-type={p.dynamicScale?.contentType}
      >
        <div className="card-visual">
          {/* 2026-08-16 起视频不再 autoplay:poster 是 ffmpeg 抽的第 0 帧,
              激活(桌面 hover / 触屏居中)才播放,见 covers.tsx。
              cover-in 直接写死:海报即时可见,不必再等 useCoverFade 的载入淡入。 */}
          {p.iphone ? (
            <div className="iphone-frame">
              <div className="iphone-notch"></div>
              <div className="iphone-screen">
                <CoverVideo
                  className="iphone-video cover-in"
                  src={p.src}
                  poster={`posters/${p.src.replace(/\.mp4$/, '')}.webp`}
                />
              </div>
            </div>
          ) : (
            <CoverVideo
              className="card-video cover-in"
              src={p.src}
              poster={`posters/${p.src.replace(/\.mp4$/, '')}.webp`}
            />
          )}
        </div>
      </article>
      <CardInfo label={p.label} tag={p.tag} date={p.date} />
    </div>
  );
}

/* modalTitle(test/page-interaction 实验):首页模态内嵌时由 HomePage 传入 ——
   标题随整块从索引行位置平移上来,本身就是那行字的延续,不再自己播逐字升起:
   'held' = 位移期间按住,'revealed' = 瞬时显形。
   独立 archive.html 入口不传,标题走自己的 per-character rise,行为与线上一致。 */
export default function ArchivePage({ modalTitle }: { modalTitle?: 'held' | 'revealed' }) {
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  useAppReady();
  useHeaderAlwaysVisible();
  useStickyMenu();
  useScrollProgress();
  usePauseOffscreenMedia();
  useNavSolidOnScroll();
  useNavSpy();
  usePillarEntrance();
  useHideNavOnScrollMobile();
  useCoverFade();
  useDynamicScale();
  useSmoothScrollAnchors();

  /* icon 模态:Esc 关闭 + body.modal-open 锁滚动(移植 archive.html 内联脚本) */
  useEffect(() => {
    document.body.classList.toggle('modal-open', modalSrc !== null);
    if (modalSrc === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalSrc(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalSrc]);

  const openModal = (e: React.MouseEvent, src: string) => {
    e.preventDefault();
    setModalSrc(src);
  };

  return (
    <>
      <div className="page-title-row">
        <PageTitle text="Archive" held={!!modalTitle} revealed={modalTitle === 'revealed'} />
        <PageCollapse
          modal={!!modalTitle}
          held={modalTitle === 'held'}
          riseDelay={7 * RISE_CHAR_STEP}
        />
      </div>
      {/* VIBEDESIGN banner 于 2026-08-17 下架(用户定);demo 文件 design-banner.html
          保留在仓库里,想恢复时把这张 banner-card 加回来即可。
          所有 demo iframe 同 Blog 封面一套「海报首帧 → 激活才动」交接,见 covers.tsx */}
      <aside className="design-menu" aria-label="Design 分类">
        <a href="#ai-native-design" className="nav-cat"><PixelIcon d={PIXEL_PATHS.ICON_SKILL} />Icon Skill</a>
        <a href="#cat-aigc" className="nav-cat"><PixelIcon d={PIXEL_PATHS.AIGC} />AIGC</a>
        <a href="#cat-motion" className="nav-cat"><PixelIcon d={PIXEL_PATHS.MOTION} />Visual Motion</a>
        <a href="#cat-ux" className="nav-cat"><PixelIcon d={PIXEL_PATHS.UX} />Visual UX</a>
      </aside>
      <div className="design-content">
        <section className="category-section home-section" id="ai-native-design">
          <div className="section-divider">
            <HeadingRise text="Icon Skill" icon={<HeadingIcon d={PIXEL_PATHS.ICON_SKILL} />} />
          </div>
          <div className="category-grid">
            {/* Outlined Icon — 封面卡(内页前 9 个图标动效预览),点击看全部 */}
            <div className="card-wrapper" data-delay="100">
              <a
                href="icon-studio/outlined.html"
                data-modal-src="icon-studio/outlined.html?modal=1&v=2"
                className="card foundation-card icon-cover"
                onClick={(e) => openModal(e, 'icon-studio/outlined.html?modal=1&v=2')}
              >
                {/* 容器给白色实底:预览页是透明 embed,海报的背板也是白 ——
                    不加的话 hover 撤海报瞬间会透出 <a> 卡的灰底,颜色跳变
                    (2026-08-17 用户:hover 背景不要变色) */}
                <CoverIframe
                  src="icon-studio/preview-outlined.html?v=4"
                  poster="posters/preview-outlined.webp"
                  className="icon-preview-frame cover-in"
                  style={{ background: '#fff' }}
                  frameProps={{ title: 'Outlined Icon 预览', scrolling: 'no', tabIndex: -1 }}
                  eager
                />
              </a>
              <CardInfo label="Outlined Icon" date="2026-05-20" />
            </div>
            {/* Pixel Icon — 封面卡(内页前 9 个图标动效预览),点击看全部 */}
            <div className="card-wrapper" data-delay="150">
              <a
                href="icon-studio/pixel.html"
                data-modal-src="icon-studio/pixel.html?modal=1&v=2"
                className="card foundation-card icon-cover"
                onClick={(e) => openModal(e, 'icon-studio/pixel.html?modal=1&v=2')}
              >
                <CoverIframe
                  src="icon-studio/preview-pixel.html?v=4"
                  poster="posters/preview-pixel.webp"
                  className="icon-preview-frame cover-in"
                  style={{ background: '#fff' }}
                  frameProps={{ title: 'Pixel Icon 预览', scrolling: 'no', tabIndex: -1 }}
                  eager
                />
              </a>
              <CardInfo label="Pixel Icon" date="2026-05-20" />
            </div>
          </div>
        </section>

        {/* AI 生成作品(从 Visual Motion 拎出的动态海报) */}
        <section className="category-section" id="cat-aigc" data-category="ai-generated">
          <div className="section-divider">
            <HeadingRise text="AIGC" icon={<HeadingIcon d={PIXEL_PATHS.AIGC} />} />
          </div>
          <div className="category-grid">
            {/* AI Poster 轮播:四张动态海报叠成一摞,实现在 poster-stack.html;
                demo 页面底透明、海报也抠了通道,露出 .card 的主题底色(--gray-100),
                浅深主题都无缝(2026-08-17 用户:背景改主题色,替换原中性灰 #E2E2E2) */}
            <div className="card-wrapper" data-delay="50" data-group="co-creation" data-category="motion-posters">
              <article className="card card-full-demo">
                <div className="card-iframe-container">
                  <CoverIframe
                    src="poster-stack.html?v=4"
                    poster="posters/poster-stack.webp"
                    className="card-iframe cover-in"
                    frameProps={{ title: 'AI Poster 轮播', scrolling: 'no', tabIndex: -1 }}
                  />
                </div>
              </article>
              <CardInfo label="AI Poster" tag="Jimeng AI" date="2026-05-06" />
            </div>
          </div>
        </section>

        {/* Visual Motion */}
        <section className="category-section" id="cat-motion" data-group="co-creation" data-category="motion-posters">
          <div className="section-divider">
            <HeadingRise text="Visual Motion" icon={<HeadingIcon d={PIXEL_PATHS.MOTION} />} />
          </div>
          <div className="category-grid">
            {/* AI Assistant Motion */}
            <div className="card-wrapper" data-delay="250" data-group="co-creation" data-category="motion-posters">
              <article className="card card-full-demo">
                <div className="card-iframe-container">
                  <CoverIframe
                    src="ai-assistant-motion/index.html?v=2"
                    poster="posters/ai-assistant-motion.webp"
                    className="card-iframe cover-in"
                    frameProps={{ allowFullScreen: true }}
                  />
                </div>
              </article>
              <CardInfo label="AI Assistant Motion" tag="Claude Code" date="2026-03-16" />
            </div>
            <VideoCard delay={300} group="co-creation" category="motion-posters" cardClass="card card-tall card-video-full card-gray-outline" src="voicer_compressed.mp4" label="Voicer" tag="Adobe After Effects" date="2025-06-14" />
            <VideoCard delay={350} group="co-creation" category="motion-posters" cardClass="card card-tall card-video-full card-gray-outline" src="voicer_card_compressed.mp4" label="Voicer Card" tag="Adobe After Effects" date="2025-06-14" />
            <VideoCard delay={400} group="co-creation" category="motion-posters" cardClass="card card-tall card-video-full card-gray-outline" src="voicer_search_bar_compressed.mp4" label="Voicer Search Bar" tag="Adobe After Effects" date="2025-06-14" />
            <VideoCard delay={450} group="co-creation" category="motion-posters" cardClass="card card-tall card-video-full card-gray-outline" src="voicer_loading_compressed.mp4" label="Voicer Loading" tag="Adobe After Effects" date="2025-06-14" />
          </div>
        </section>

        {/* VisualUX (AI Native Design) — merged from former AI Product UX + 3D Visuals */}
        <section className="category-section" id="cat-ux" data-group="native" data-category="visualux">
          <div className="section-divider">
            <HeadingRise text="Visual UX" icon={<HeadingIcon d={PIXEL_PATHS.UX} />} />
          </div>
          <div className="category-grid">
            {/* Eye Tracking */}
            <div className="card-wrapper" data-delay="50" data-group="native" data-category="visualux">
              <article className="card card-full-demo card-dynamic-scale" data-content-height="812">
                <div className="card-iframe-container">
                  <CoverIframe
                    src="multi-scene-character-demo/multi-scene-character-demo.html"
                    poster="posters/multi-scene-character-demo.webp"
                    className="card-iframe cover-in"
                    frameProps={{ allowFullScreen: true }}
                  />
                </div>
              </article>
              <CardInfo label="Eye Tracking" tag="Claude Code" date="2026-01-08" />
            </div>
            {/* Voice Particles */}
            <div className="card-wrapper" data-delay="100" data-group="native" data-category="visualux">
              <article className="card card-full-demo card-dynamic-scale" data-content-height="812" data-target-ratio="1">
                <div className="card-iframe-container">
                  <CoverIframe
                    src="voice-particles/index.html"
                    poster="posters/voice-particles.webp"
                    className="card-iframe cover-in"
                    frameProps={{ allowFullScreen: true }}
                  />
                </div>
              </article>
              <CardInfo label="Voice Particles" tag="Gemini 3 Pro" date="2026-01-05" />
            </div>
            <VideoCard delay={150} group="native" category="visualux" cardClass="card card-tall card-video-full" src="Metal_compressed.mp4" label="3D Rotation Effect" tag="Claude Code" date="2026-01-15" />
            <VideoCard delay={200} group="native" category="visualux" cardClass="card card-tall card-video-full" src="3DCardGlass_compressed.mp4" label="3D Rotation Effect" tag="Claude Code" date="2026-01-10" />
            <VideoCard delay={250} group="native" category="visualux" cardClass="card card-tall card-dynamic-scale" src="3DSphere-particle_compressed.mp4" label="3D Sphere" tag="Claude Code" date="2026-01-03" iphone dynamicScale={{ contentHeight: 844, contentType: 'iphone' }} />
            <VideoCard delay={300} group="native" category="visualux" cardClass="card card-tall card-scaled-up" src="3DBallsIPhone_compressed.mp4" label="Glass Balls" tag="Claude Code" date="2025-12-28" />
            <VideoCard delay={350} group="native" category="visualux" cardClass="card card-tall card-video-full card-video-scaled-down" src="3DSphere_compressed.mp4" label="Gesture Interaction" tag="Claude Code" date="2025-12-20" />
            <VideoCard delay={400} group="native" category="visualux" cardClass="card card-tall card-video-full card-video-scaled-down" src="3DCards_compressed.mp4" label="Gyroscope" tag="Claude Code" date="2025-12-15" />
          </div>
        </section>
      </div>

      {/* Icon Library 模态层:portal 到 body,保持旧版「main 的兄弟节点」DOM 位置 */}
      {createPortal(
        <div className={'icon-modal' + (modalSrc ? ' show' : '')} id="iconModal" aria-hidden={modalSrc ? 'false' : 'true'}>
          <div className="icon-modal-backdrop" data-modal-close onClick={() => setModalSrc(null)}></div>
          <div className="icon-modal-dialog" role="dialog" aria-modal="true" aria-label="Icon Library">
            <button className="icon-modal-close" type="button" aria-label="关闭" data-modal-close onClick={() => setModalSrc(null)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>
            </button>
            {/* 关闭时 src 回 about:blank,卸载内容停止动画(与旧版一致) */}
            <iframe className="icon-modal-frame" id="iconModalFrame" title="Icon Library" src={modalSrc ?? 'about:blank'}></iframe>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
