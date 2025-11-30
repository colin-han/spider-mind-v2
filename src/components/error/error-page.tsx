import React from "react";
import { Home, ArrowLeft, Sparkles } from "lucide-react";
import { ErrorButton } from "./button";

interface ErrorPageProps {
  type: "404" | "403";
  onGoHome?: () => void;
  onLogin?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  type,
  onGoHome,
  onLogin,
}) => {
  const isNotFound = type === "404";

  // 友好的中文文案
  const title = isNotFound ? "哎呀，网破了个洞！" : "滴滴！蜘蛛感应报警";
  const subtitle = isNotFound
    ? "找不到你要访问的思维导图。"
    : '这里是私人领地，闲"蛛"免进哦。';

  const description = isNotFound
    ? "可能是链接失效了，或者这个导图已经被原来的主人清理掉了。别灰心，我们回大本营重新织网吧。"
    : '看来你没有钥匙进入这个"秘密基地"。如果你是这里的主人，请尝试切换账号登录，或者联系管理员。';

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden text-gray-800 dark:text-gray-200 font-sans selection:bg-brand-200 dark:selection:bg-brand-800">
      {/* Background Decor: Playful Organic Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-200/40 dark:bg-brand-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-float-slow opacity-60" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-pop-400/20 dark:bg-pop-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-float-delayed opacity-60" />

      {/* Background Decor: Subtle Web Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)] -z-10 opacity-50" />

      {/* Main Content Container */}
      <div className="max-w-2xl w-full px-6 flex flex-col items-center text-center z-10">
        {/* Dynamic Header Badge */}
        <div
          className={`
          animate-bounce-slow mb-8 px-4 py-1.5 rounded-full border-2 text-sm font-extrabold tracking-wide uppercase shadow-sm
          ${
            isNotFound
              ? "bg-white dark:bg-gray-800 border-brand-200 dark:border-brand-700 text-brand-600 dark:text-brand-400"
              : "bg-white dark:bg-gray-800 border-red-200 dark:border-red-700 text-red-500 dark:text-red-400"
          }
        `}
        >
          {isNotFound ? "404 • 迷路的小蜘蛛" : "403 • 访客止步"}
        </div>

        {/* Fun SVG Illustration */}
        <div className="relative mb-8 w-72 h-72 md:w-96 md:h-80 drop-shadow-xl transition-transform hover:scale-105 duration-500">
          <SpiderIllustration type={type} />
        </div>

        {/* Text Content */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-gray-900 dark:text-white drop-shadow-sm">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-pop-500 dark:from-brand-400 dark:to-pop-400">
            {title}
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 font-bold mb-3">
          {subtitle}
        </p>

        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-10 leading-relaxed text-base md:text-lg">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
          <ErrorButton
            variant="primary"
            onClick={onGoHome}
            icon={<Home size={20} />}
            className="w-full sm:w-auto min-w-[160px]"
          >
            回到首页
          </ErrorButton>

          {type === "403" && (
            <ErrorButton
              variant="outline"
              onClick={onLogin}
              className="w-full sm:w-auto"
            >
              切换账号
            </ErrorButton>
          )}

          {type === "404" && (
            <ErrorButton
              variant="ghost"
              onClick={() => window.history.back()}
              icon={<ArrowLeft size={20} />}
              className="w-full sm:w-auto"
            >
              返回上页
            </ErrorButton>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-6 flex items-center gap-2 text-gray-400 dark:text-gray-600 font-bold text-sm opacity-50 hover:opacity-100 transition-opacity cursor-default">
        <Sparkles size={16} className="text-brand-400 dark:text-brand-600" />
        <span>Spider Mind</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Custom "Cute Spider" Illustration
// ------------------------------------------------------------
const SpiderIllustration: React.FC<{ type: "404" | "403" }> = ({ type }) => {
  const isNotFound = type === "404";
  const primaryColor = isNotFound ? "#7c3aed" : "#374151"; // Violet or Gray
  const secondaryColor = isNotFound ? "#f43f5e" : "#ef4444"; // Pink or Red

  return (
    <svg
      viewBox="0 0 400 320"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {isNotFound ? (
        // ------------------ 404 SPIDER (Confused / Broken Web) ------------------
        // 将蜘蛛丝和蜘蛛包裹在一起，使用 transform-origin 设置旋转中心点
        <g className="animate-swing" style={{ transformOrigin: "200px 0px" }}>
          {/* Hanging Thread - 从顶部到蜘蛛身体 */}
          <line
            x1="200"
            y1="0"
            x2="200"
            y2="100"
            stroke="#e5e7eb"
            strokeWidth="3"
          />

          {/* Broken Thread End */}
          <path
            d="M190 100 Q 200 110 210 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />

          {/* Spider Body (Hanging upside down slightly) */}
          <g transform="translate(200, 160) rotate(10)">
            {/* Legs */}
            <path
              d="M-30 -20 Q -50 -50 -70 -10"
              fill="none"
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M-35 0 Q -60 0 -80 20"
              fill="none"
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M-30 20 Q -50 50 -70 40"
              fill="none"
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
            />

            <path
              d="M30 -20 Q 50 -50 70 -10"
              fill="none"
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M35 0 Q 60 0 80 20"
              fill="none"
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M30 20 Q 50 50 70 40"
              fill="none"
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Main Body */}
            <ellipse cx="0" cy="0" rx="45" ry="40" fill={primaryColor} />
            <circle cx="0" cy="-35" r="25" fill={primaryColor} />

            {/* Dizzy Eyes */}
            <circle cx="-10" cy="-35" r="8" fill="white" />
            <text
              x="-14"
              y="-31"
              fontSize="10"
              fontFamily="sans-serif"
              fill={primaryColor}
            >
              x
            </text>
            <circle cx="10" cy="-35" r="8" fill="white" />
            <text
              x="6"
              y="-31"
              fontSize="10"
              fontFamily="sans-serif"
              fill={primaryColor}
            >
              x
            </text>

            {/* Mouth */}
            <path
              d="M-10 -15 Q 0 -10 10 -15"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Holding a map icon */}
            <g transform="translate(45, 10) rotate(-20)">
              <rect
                x="0"
                y="0"
                width="40"
                height="30"
                rx="4"
                fill="white"
                stroke={secondaryColor}
                strokeWidth="2"
              />
              <path
                d="M10 10 L 20 20 L 30 5"
                fill="none"
                stroke={secondaryColor}
                strokeWidth="2"
              />
              <text x="25" y="25" fontSize="16">
                ?
              </text>
            </g>
          </g>
        </g>
      ) : (
        // ------------------ 403 SPIDER (Security Guard) ------------------
        <g className="animate-float-fast">
          {/* Thread holding the spider */}
          <line
            x1="200"
            y1="0"
            x2="200"
            y2="120"
            stroke="#9ca3af"
            strokeWidth="2"
          />

          <g transform="translate(200, 160)">
            {/* Legs (Crossed/Standing stance) */}
            <path
              d="M-30 -10 Q -60 -40 -70 10"
              fill="none"
              stroke="#374151"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M-35 10 Q -60 10 -50 30"
              fill="none"
              stroke="#374151"
              strokeWidth="6"
              strokeLinecap="round"
            />

            <path
              d="M30 -10 Q 60 -40 70 10"
              fill="none"
              stroke="#374151"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M35 10 Q 60 10 50 30"
              fill="none"
              stroke="#374151"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Body */}
            <ellipse cx="0" cy="0" rx="45" ry="40" fill="#374151" />
            <circle cx="0" cy="-35" r="25" fill="#374151" />

            {/* Tie */}
            <path d="M-5 -5 L 5 -5 L 0 25 Z" fill="#ef4444" />

            {/* Sunglasses */}
            <path
              d="M-22 -40 Q -10 -40 0 -35 Q 10 -40 22 -40 L 22 -25 Q 10 -25 0 -30 Q -10 -25 -22 -25 Z"
              fill="black"
              stroke="white"
              strokeWidth="1"
            />

            {/* Badge */}
            <circle cx="20" cy="10" r="8" fill="#fbbf24" />
            <path
              d="M16 10 L 24 10 M 20 6 L 20 14"
              stroke="#b45309"
              strokeWidth="2"
            />

            {/* Lock Icon Floating */}
            <g transform="translate(-70, -60) rotate(-15)">
              <rect x="0" y="20" width="40" height="30" rx="4" fill="#f43f5e" />
              <path
                d="M10 20 V 10 A 10 10 0 0 1 30 10 V 20"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="4"
              />
              <circle cx="20" cy="35" r="4" fill="white" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
};
