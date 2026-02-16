export type WorkTag = "Photography" | "Video" | "Personal" | "Portrait" | "Exhibition";

export type Work = {
  slug: string;
  date: string; // YYYY/MM/DD
  title: string;
  tags: WorkTag[];
  year: string;
  excerpt: string;
  details: {
    /* 展示情報 */
    artist: string;
    period: string;
    venue: string;
    address: string;
    access: string;
    hours: string;
    closed: string;
    admission: string;
    organizer?: string;
    curator?: string;
    /* 作品情報 */
    medium?: string;
    dimensions?: string;
    edition?: string;
    series?: string;
    /* 出版情報 */
    publisher?: string;
    pages?: string;
    binding?: string;
    price?: string;
    /* クレジット */
    credit_photo?: string;
    credit_design?: string;
    credit_cooperation?: string;
    /* その他 */
    bio?: string;
  };
  thumbnail?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  media: {
    id: string;
    type: "image" | "video";
    src: string;
    alt: string;
    width: number;
    height: number;
    poster?: string;
  }[];
};

export type TimelineItem = {
  id: string;
  date: string;
  type: "photo" | "text";
  title?: string;
  text: string;
  tags?: string[];
  images?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }[];
};

export type TextPost = {
  slug: string;
  year: string;
  title: string;
  categories: Exclude<WorkTag, "Exhibition">[];
  body: string;
  toc?: { id: string; label: string }[];
  sections?: { id: string; heading: string; body: string }[];
};

export const works: Work[] = Array.from({ length: 24 }).map((_, i) => {
  const n = i + 1;
  const slug = `work-${n}`;
  return {
    slug,
    date: `2024/10/09`,
    title: "Eglit Hill",
    tags:
      n % 4 === 0
        ? ["Exhibition", "Personal", "Photography"]
        : n % 4 === 1
          ? ["Personal", "Photography"]
          : n % 4 === 2
            ? ["Photography"]
            : ["Exhibition", "Personal", "Photography"],
    year: "2025",
    excerpt:
      "土を掘り返していると鳥が寄って来る。地中から出てきた幼虫を摘んでどこかへと飛んでいく。私には見えていないものが見えている。見えていないのではなくて、きっと違う注意力を持っているのだろう。\n\n土を掘り返していると鳥が寄って来る。地中から出てきた幼虫を摘んでどこかへと飛んでいく。私には見えていないものが見えている。見えていないのではなくて、きっと違う注意力を持っているのだろう。",
    details: {
      artist: "Eglit Hill",
      period: "2025.01.08–2025.10.07",
      venue: "Hamada House East",
      hours: "11:00–18:00",
      closed: "Mon",
      admission: "Free",
      address: "兵庫県神戸市中央区（仮）",
      access: "JR三ノ宮駅から徒歩8分（仮）",
      bio:
        "都市周縁の空間と身体の距離を主題に、写真と映像を横断しながら制作。展示空間に応じた再編集を継続している。",
    },
    media: Array.from({ length: 24 }).map((__, k) => {
      const index = k + 1;
      const isVideo = (n === 1 && index === 1) || index % 8 === 0;
      if (isVideo) {
        return {
          id: `media-${index}`,
          type: "video" as const,
          src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          alt: `${slug} video ${index}`,
          width: 1280,
          height: 720,
          poster: `https://picsum.photos/seed/${slug}-video-${index}/1280/720`,
        };
      }
      const isPortrait = index % 5 === 0 || (n === 2 && index === 1);
      const width = isPortrait ? 800 : 1280;
      const height = isPortrait ? 1280 : 800;
      return {
        id: `media-${index}`,
        type: "image" as const,
        // Temporary visual seed. Later replace with WP media URL directly.
        src: `https://picsum.photos/seed/${slug}-${index}/${width}/${height}`,
        alt: `${slug} image ${index}`,
        width,
        height,
      };
    }),
  };
});

export const timeline: TimelineItem[] = [
  {
    id: "t1",
    date: "2026.02.09 18:22",
    type: "photo",
    text: "夕方の港。水面に映る光が揺れるたび、別の場所のように見える。",
    images: [
      { src: "https://picsum.photos/seed/tl-1a/1280/800", alt: "港の夕景", width: 1280, height: 800 },
    ],
  },
  {
    id: "t2",
    date: "2026.02.09 10:05",
    type: "text",
    text: "朝から現像作業。昨日撮ったフィルムを見返すと、現場で感じた空気感とプリント上の印象にずれがある。そのずれこそが写真の固有性なのだと思うけれど、まだうまく言語化できない。",
  },
  {
    id: "t3",
    date: "2026.02.08 15:40",
    type: "photo",
    text: "土を掘り返していると鳥が寄って来る。地中から出てきた幼虫を摘んでどこかへ飛んでいく。私には見えていないものが見えている。",
    images: [
      { src: "https://picsum.photos/seed/tl-3a/1280/800", alt: "畑と鳥", width: 1280, height: 800 },
      { src: "https://picsum.photos/seed/tl-3b/800/1200", alt: "鳥の近影", width: 800, height: 1200 },
    ],
  },
  {
    id: "t4",
    date: "2026.02.08 09:12",
    type: "text",
    text: "見えていないのではなくて、きっと違う注意力を持っているのだろう。鳥の視線で世界を見たら、地面はもっと情報に満ちているはずだ。",
  },
  {
    id: "t5",
    date: "2026.02.07 20:30",
    type: "text",
    text: "展示のステートメントを書き直している。言葉にすると写真が持っていた曖昧さが消えてしまう。かといって何も書かないわけにはいかない。最低限の補助線だけ引くつもりで書く。",
  },
  {
    id: "t6",
    date: "2026.02.06 14:18",
    type: "photo",
    text: "午後の光。建物の影が道に落ちて、境界線のように見えた。",
    images: [
      { src: "https://picsum.photos/seed/tl-6a/1280/800", alt: "建物の影", width: 1280, height: 800 },
    ],
  },
  {
    id: "t7",
    date: "2026.02.06 08:45",
    type: "text",
    text: "早朝の散歩。霧が出ていて、50m先がぼやけている。写真を撮る気にはならなかったが、この距離感は覚えておきたい。",
  },
  {
    id: "t8",
    date: "2026.02.05 16:00",
    type: "photo",
    text: "",
    images: [
      { src: "https://picsum.photos/seed/tl-8a/1280/800", alt: "河川敷", width: 1280, height: 800 },
      { src: "https://picsum.photos/seed/tl-8b/1280/800", alt: "河川敷2", width: 1280, height: 800 },
      { src: "https://picsum.photos/seed/tl-8c/800/1200", alt: "河川敷3", width: 800, height: 1200 },
    ],
  },
  {
    id: "t9",
    date: "2026.01.30 11:20",
    type: "text",
    text: "プリントのサイズを決めかねている。大きく伸ばすと空間が変わるが、小さいプリントの親密さも捨てがたい。展示空間の図面をもう一度見直す。",
  },
  {
    id: "t10",
    date: "2026.01.28 19:50",
    type: "photo",
    text: "夜の公園。街灯の下だけが異様に明るくて、そこだけ切り取られた舞台のようだった。",
    images: [
      { src: "https://picsum.photos/seed/tl-10a/1280/800", alt: "夜の公園", width: 1280, height: 800 },
    ],
  },
  {
    id: "t11",
    date: "2026.01.25 13:00",
    type: "text",
    text: "撮影は結論ではなく、視線の履歴だと思う。どこで立ち止まり、どの距離で迷い、何を採用し何を捨てたか。そうした判断の連続が、結果として一枚の像に残る。",
  },
  {
    id: "t12",
    date: "2025.12.20 10:30",
    type: "photo",
    text: "冬の海。波打ち際を歩くと、足元の砂が光を反射して銀色に見える。",
    images: [
      { src: "https://picsum.photos/seed/tl-12a/1280/800", alt: "冬の海", width: 1280, height: 800 },
    ],
  },
];

export const texts: TextPost[] = [
  {
    slug: "text-1",
    year: "2024",
    title: "これはテストです",
    categories: ["Video", "Photography"],
    body:
      "土を掘り返していると鳥が寄って来る。地中から出てきた幼虫を摘んでどこかへ飛んでいく。私には見えていないものが見えている。見えていないのではなくて、きっと違う注意力を持っているのだろう。土を掘り返していると鳥が寄って来る。地中から出てきた幼虫を摘んでどこかへ飛んでいく。私には見えていないものが見えている。見えていないのではなくて、きっと違う注意力を持っているのだろう。\n\n土を掘り返していると鳥が寄って来る。地中から出てきた幼虫を摘んでどこかへ飛んでいく。私には見えていないものが見えている。見えていないのではなくて、きっと違う注意力を持っているのだろう。",
    toc: [
      { id: "s-intro", label: "序" },
      { id: "s-fieldnote", label: "観察ノート" },
      { id: "s-image", label: "イメージと距離" },
      { id: "s-edit", label: "編集の方針" },
      { id: "s-after", label: "撮影後" },
    ],
    sections: [
      {
        id: "s-intro",
        heading: "序",
        body:
          "このテキストは、撮影の前後で見えているものがどう変化するかを整理するための覚え書きです。現場に立つ前に考えていたことと、実際に歩いたあとに残る感覚には、いつも少しだけ差があります。その差を記録しておくことが、次の撮影の入口になります。\n\n写真は結論ではなく、視線の履歴です。どこで立ち止まり、どの距離で迷い、何を採用し何を捨てたか。そうした判断の連続が、結果として一枚の像に残ります。",
      },
      {
        id: "s-fieldnote",
        heading: "観察ノート",
        body:
          "朝の光は輪郭をはっきりさせ、夕方の光は面を柔らかくします。同じ場所でも時間帯が変わるだけで、被写体の重心は移動します。まずは30分単位で立ち位置を変えず、光と影の変化だけを観察します。\n\n音や匂い、足元の温度のような、写真に直接写らない情報も同時にメモします。後でコンタクトシートを見ると、写っていないはずの情報が選択基準として効いていることがよくあります。",
      },
      {
        id: "s-image",
        heading: "イメージと距離",
        body:
          "被写体との距離は、画角の問題というより関係性の問題です。近づくほど情報は増えますが、文脈は減ります。離れるほど説明は増えますが、体温は下がります。その中間点を探すために、同じ対象を複数の距離で反復して撮ります。\n\n縦位置は身体の起伏を、横位置は場の連なりを拾いやすい。どちらが正しいというより、何を伝えたいかで選ぶべきだと考えています。",
      },
      {
        id: "s-edit",
        heading: "編集の方針",
        body:
          "編集では、まず似ている写真を隣接させます。次に、似ている中で一番弱い写真を落とします。これを繰り返すと、残るのは説明のための写真ではなく、流れを作る写真になります。\n\n単体で強い写真が、並びの中で強いとは限りません。連続して見るときに必要なのは、強度よりもテンポです。視線の速度が急に止まる箇所は、意図がない限り修正します。",
      },
      {
        id: "s-after",
        heading: "撮影後",
        body:
          "公開後に見返すと、撮影時の確信が過剰だったと気づくことがあります。時間が経つと、写真は作者の意図よりも閲覧者の経験に接続されます。その余白を確保するため、キャプションは最小限にします。\n\n最終的には、作品そのものだけでなく、撮影から編集までの判断の履歴が次のプロジェクトの基準になります。この文章もその履歴の一部です。",
      },
    ],
  },
  {
    slug: "text-2",
    year: "2024",
    title: "テストタイトル",
    categories: ["Personal"],
    body:
      "土を掘り返していると鳥が寄って来る。地中から出てきた幼虫を摘んでどこかへ飛んでいく。私には見えていないものが見えている。見えていないのではなくて、きっと違う注意力を持っているのだろう。",
  },
];

/* ── News ── */

export type NewsItem = {
  id: string;
  date: string;
  title: string;
  body: string;
  image?: { src: string; width: number; height: number };
};

export const news: NewsItem[] = [
  {
    id: "news-1",
    date: "2025.10.15",
    title: "個展「Field Notes」開催のお知らせ",
    body: "2025年11月1日より、GALLERY SPACEにて個展「Field Notes」を開催します。新作を含む写真作品約30点を展示予定です。",
    image: { src: "https://picsum.photos/seed/news-1/800/500", width: 800, height: 500 },
  },
  {
    id: "news-2",
    date: "2025.09.20",
    title: "グループ展「見ることの輪郭」参加",
    body: "東京都写真美術館にて開催のグループ展に参加します。会期は10月5日〜11月30日。",
    image: { src: "https://picsum.photos/seed/news-2/800/500", width: 800, height: 500 },
  },
  {
    id: "news-3",
    date: "2025.07.01",
    title: "ウェブサイトをリニューアルしました",
    body: "ポートフォリオサイトを全面的にリニューアルしました。過去作品のアーカイブおよびテキストを公開しています。",
  },
  {
    id: "news-4",
    date: "2025.04.10",
    title: "写真集「距離について」刊行",
    body: "2022年から2024年にかけて撮影した作品をまとめた写真集を自主出版しました。オンラインショップにて販売中です。",
    image: { src: "https://picsum.photos/seed/news-4/800/500", width: 800, height: 500 },
  },
  {
    id: "news-5",
    date: "2024.12.01",
    title: "アーティスト・イン・レジデンス採択",
    body: "2025年度のアーティスト・イン・レジデンスプログラムに採択されました。滞在制作の記録はTimelineにて更新予定です。",
  },
];

/* ── About ── */

export const about = {
  statement:
    "写真家。1990年宮城県石巻市生まれ。風景と人の関係、視線の履歴をテーマに写真・映像作品を制作。撮影から編集、展示設計までを一貫して手がける。近年は土地の記憶と身体性に焦点を当てたフィールドワーク的手法を軸に活動。\n\n制作においては、まず対象のある土地に一定期間滞在し、歩行と観察を繰り返すことから始める。カメラを構える前に場所との距離を測り、光や音、温度の変化を記録する。そのプロセスを経て撮影された写真は、被写体の説明ではなく、視線が移動した痕跡として機能することを目指している。\n\n展示では、空間の構造や動線を設計に組み込み、鑑賞者の身体的な体験と写真の関係を模索している。写真集の制作においても、ページをめくる時間やリズムを編集の要素として重視する。\n\n主な関心領域は、風景論、場所の記憶、身体と知覚の関係、写真の時間性。近年は映像作品にも取り組み、静止画と動画の境界を探る実験的な制作を行っている。",
  photos: [
    { src: "https://picsum.photos/seed/about-1/640/420", width: 640, height: 420 },
    { src: "https://picsum.photos/seed/about-2/420/640", width: 420, height: 640 },
    { src: "https://picsum.photos/seed/about-3/640/420", width: 640, height: 420 },
    { src: "https://picsum.photos/seed/about-4/420/640", width: 420, height: 640 },
    { src: "https://picsum.photos/seed/about-5/640/420", width: 640, height: 420 },
  ],
  cv: [
    /* 略歴 */
    { year: "", content: "略歴" },
    { year: "2019", content: "東北芸術工科大学デザイン工学部 映像学科卒" },
    { year: "2021", content: "石巻のキワマリ荘代表を引き継ぐ" },
    { year: "2025", content: "《目の星 - menoshoshi》をオープン" },
    /* 個展 */
    { year: "", content: "個展" },
    { year: "2019", content: "「Move」GALVANIZE gallery (Miyagi, Ishinomaki)" },
    { year: "2021", content: "「偶然の波打ち際」GALVANIZE gallery (Miyagi, Ishinomaki)" },
    { year: "2022", content: "「日付のある風景」GALVANIZE gallery (Miyagi, Ishinomaki)" },
    { year: "2023", content: "「日毎の風景」GALVANIZE gallery (Miyagi, Ishinomaki)" },
    { year: "2024", content: "「Egret Hill」SARP (Miyagi, Sendai)" },
    { year: "2025", content: "「流れる目の途中」目の星 - menoshoshi (Miyagi, Ishinomaki)" },
    /* グループ展・企画展など */
    { year: "", content: "グループ展・企画展など" },
    { year: "2019", content: "「Reborn-Art Festival 2019」(Miyagi, Ishinomaki)" },
    { year: "2021", content: "「手つかずの庭 2021」石巻のキワマリ荘 / ART DRUG CENTER / THE ROOMERS' GARDEN" },
    { year: "2022", content: "「手つかずの庭 2022」石巻のキワマリ荘 / ART DRUG CENTER / THE ROOMERS' GARDEN" },
  ],
};
