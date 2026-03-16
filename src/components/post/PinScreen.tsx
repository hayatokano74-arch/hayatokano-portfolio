"use client";

/* ── PIN入力画面 ── */
type PinScreenProps = {
  pinInput: string;
  setPinInput: (v: string) => void;
  pinError: string;
  pinLoading: boolean;
  onSubmit: (pin: string) => void;
};

export function PinScreen({ pinInput, setPinInput, pinError, pinLoading, onSubmit }: PinScreenProps) {
  return (
    <div className="post-pin-screen">
      <h1 className="post-pin-title">Timeline Post</h1>
      <p className="post-pin-desc">PINを入力してください</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(pinInput);
        }}
        className="post-pin-form"
      >
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          className="post-pin-input"
          placeholder="PIN"
          aria-label="PIN入力"
          autoFocus
        />
        <button
          type="submit"
          disabled={pinLoading || !pinInput}
          className="post-btn post-btn-primary"
        >
          {pinLoading ? "確認中…" : "確認"}
        </button>
      </form>
      {pinError && <p className="post-pin-error">{pinError}</p>}
    </div>
  );
}
