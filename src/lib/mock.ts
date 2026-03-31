/**
 * フォールバック用モックデータ
 *
 * WP API が未設定/失敗時のフォールバックとして各 lib/ モジュールが参照する。
 * 型定義は types.ts に移動済み。
 */

import type { Work, WorkTag, TextPost, NewsItem } from "@/lib/types";

/* 型の re-export（既存の import パスとの互換性を維持） */
export type { Work, WorkTag, TextPost, NewsItem };

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
      exhibition_type: n % 3 === 0 ? "グループ展" : n % 3 === 1 ? "個展" : "芸術祭",
      exhibition_title: n % 3 !== 1 ? "Reborn-Art Festival 2025" : undefined,
      artist: "Hayato Kano",
      artists: n % 3 !== 1 ? "Hayato Kano, Yuki Tanaka, Rina Suzuki, Takeshi Mori" : undefined,
      period: "2025.01.08–2025.10.07",
      venue: "Hamada House East",
      hours: "11:00–18:00",
      closed: "Mon",
      admission: "Free",
      address: "兵庫県神戸市中央区（仮）",
      access: "JR三ノ宮駅から徒歩8分（仮）",
      organizer: n % 3 === 2 ? "Reborn-Art Festival 実行委員会" : undefined,
      curator: n % 2 === 0 ? "Fumio Watanabe" : undefined,
      supported_by: n % 3 !== 1 ? "文化庁, 宮城県, 石巻市" : undefined,
      medium: "写真、映像インスタレーション",
      dimensions: "サイズ可変",
      credit_photo: "Hayato Kano",
      credit_cooperation: n % 3 !== 1 ? "石巻のキワマリ荘" : undefined,
      award: n % 4 === 0 ? "令和7年度 芸術選奨新人賞（仮）" : undefined,
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

export const news: NewsItem[] = [];

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
