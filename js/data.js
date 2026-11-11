/*
 * 작품을 추가하거나 순서를 바꾸는 파일입니다.
 * 반응형 포트폴리오와 공용으로 사용하는 이미지는 portfolio/assets/에서 불러옵니다.
 * 작품에는 title, image와 필요에 따라 alt, width, height를 지정합니다.
 * 상세페이지의 detail은 원본 PDF와 렌더링 높이(px), 프로젝트의 url은 방문 주소입니다.
 * 서버, npm, 별도 라이브러리 없이 동작하도록 일반 JavaScript를 사용합니다.
 */
window.PORTFOLIO_DATA = {
  email: "kim7331615@naver.com",
  slideSpeed: 42, // 초당 이동 거리(px). 작을수록 천천히 흐릅니다.
  categories: {
    popup: {
      title: "POPUP",
      autoplay: true,
      items: [
        { title: "NIKE — JUST DO IT", image: "portfolio/assets/popup-nike-01.png", alt: "빨간 배경과 나이키 운동화를 활용한 프로모션 팝업" },
        { title: "OLIVE YOUNG — 마녀공장", image: "portfolio/assets/popup-oliveyoung.png", alt: "노란 배경의 마녀공장 클렌징 오일 올리브영 팝업" },
        { title: "위글위글 팝업", image: "portfolio/assets/popup-wigglewiggle.png" },
        { title: "러쉬 팝업", image: "portfolio/assets/popup-lush.png" },
        { title: "모나미 팝업", image: "portfolio/assets/popup-monami.png" },
        { title: "넷플릭스 팝업", image: "portfolio/assets/popup-netflix.png" },
        { title: "NIKE — Basketball", image: "portfolio/assets/popup-nike-02.png", alt: "농구 선수와 운동화를 배치한 주황색 나이키 팝업" },
        { title: "투썸플레이스 — 딸기 케이크", image: "portfolio/assets/popup-twosome.png", alt: "핑크색 딸기 케이크를 중심으로 구성한 투썸플레이스 팝업" },
        { title: "스탠리 팝업", image: "portfolio/assets/popup-stanley.png" },
        { title: "마뗑킴 팝업", image: "portfolio/assets/popup-matin-kim.png" }
      ]
    },
    poster: {
      title: "POSTER",
      autoplay: true,
      items: [
        { title: "Glow Mood — Lip & Cheek", image: "portfolio/assets/poster-lip.png", alt: "피치 색조의 립 앤 치크 화장품 포스터" },
        { title: "VOVA LAB — Wireless Charging", image: "portfolio/assets/poster-electronics.png", alt: "파스텔 배경에 세 가지 색상의 보조배터리를 배치한 포스터" },
        { title: "Onnono — 2026 Collection", image: "portfolio/assets/poster-furniture.png", alt: "오렌지색 소파를 강조한 Onnono 가구 포스터" },
        { title: "조명 포스터", image: "portfolio/assets/poster-lighting.png" },
        { title: "영화 포스터", image: "portfolio/assets/poster-movie.png" },
        { title: "토스터 포스터", image: "portfolio/assets/poster-toaster.png" },
        { title: "키보드 포스터", image: "portfolio/assets/poster-keyboard.png" }
      ]
    },
    banner: {
      title: "BANNER",
      autoplay: true,
      items: [
        { title: "Polaroid — The Original Instant Camera", image: "portfolio/assets/banner-01.png", width: 1920, height: 970 },
        { title: "Tamburins — Perfume Collection", image: "portfolio/assets/banner-02.png", width: 1920, height: 970 },
        { title: "Dyson — Fast Drying, Intelligent Care", image: "portfolio/assets/banner-03.png", width: 1920, height: 970 },
        { title: "Tamburins — Blue Hinoki", image: "portfolio/assets/banner-04.png", width: 1920, height: 970 },
        { title: "Blue Bottle — Start With Good Coffee", image: "portfolio/assets/banner-05.png", width: 1920, height: 970 },
        { title: "Gentle Monster — Beyond the Frame", image: "portfolio/assets/banner-06.png", width: 1920, height: 970 },
        { title: "Slow Mornings, Better Days", image: "portfolio/assets/banner-07.png", width: 1400, height: 707, alt: "따뜻한 햇살과 크루아상을 담은 베이커리 배너" },
        { title: "Go Beyond the City", image: "portfolio/assets/banner-08.png", width: 1400, height: 707, alt: "석양이 지는 산 정상과 하이커가 있는 아웃도어 배너" },
        { title: "NOCTE — A Scent After Midnight", image: "img/works/banner-nocte.png", width: 1400, height: 707, alt: "달빛 아래 바위와 향수병으로 구성한 NOCTE 배너" },
        { title: "POPPIE SODA", image: "img/works/banner-poppie.png", width: 1400, height: 701, alt: "붉은 체리와 탄산음료 캔을 활용한 POPPIE SODA 배너" }
      ]
    },
    detail: {
      title: "DETAIL PAGE",
      autoplay: false,
      items: [
        {
          title: "패브릭 상세페이지", image: "portfolio/assets/detail-fabric-cover.png", width: 860, height: 1368,
          detail: { pdf: "portfolio/assets/detail/fabric.pdf", height: 21178 }
        },
        {
          title: "스킨케어 상세페이지", image: "portfolio/assets/detail-skincare-cover.png", width: 860, height: 1286,
          detail: { pdf: "portfolio/assets/detail/skincare.pdf", height: 15720 }
        },
        {
          title: "전기포트 상세페이지", image: "portfolio/assets/detail-kettle-cover.png", width: 860, height: 1391,
          detail: { pdf: "portfolio/assets/detail/kettle.pdf", height: 23959 }
        },
        {
          title: "캔들 상세페이지", image: "portfolio/assets/detail-candle-cover.png", width: 860, height: 1341,
          detail: { pdf: "portfolio/assets/detail/candle.pdf", height: 9009 }
        }
      ]
    },
    projects: {
      title: "PROJECTS",
      autoplay: false,
      items: [
        {
          title: "MELLOWEE — 키즈 패션 쇼핑몰", image: "portfolio/assets/mellowee-board.png", width: 1352, height: 928,
          alt: "MELLOWEE 디자인과 페이지 구성 보드", note: "팀 프로젝트",
          url: "https://dnzv2ffwwp-cmyk.github.io/mellowee/"
        },
        {
          title: "ONNONO — 가구 쇼핑몰", image: "portfolio/assets/onnono-layouts.png", width: 1238, height: 982,
          alt: "ONNONO PC·태블릿·모바일 시안", note: "개인 프로젝트",
          url: "https://kim7331615-hub.github.io/Onnono_webpage/"
        },
        {
          title: "Windows 98 개인프로필 웹페이지", image: "img/desktop/wallpaper.png", width: 1920, height: 941,
          alt: "Windows 98 포트폴리오의 초록 언덕 바탕화면", note: "개인 프로젝트",
          url: "portfolio/index.html#personal-project", urlLabel: "프로젝트 설명 보기"
        }
      ]
    }
  }
};
