import {
  Transcript as TranscriptWrapper,
  TranscriptContent,
  TranscriptHeader,
  TranscriptTitle,
  useTranscript,
  Utterance,
  UtteranceItem,
  UtteranceLabel,
  UtteranceSpeaker,
  UtteranceTime,
  formatTimestamp,
} from "@boldvideo/ui";

export function Transcript({
  url,
  playerRef,
  onCueClick,
}: {
  url: string;
  playerRef: React.RefObject<HTMLVideoElement | null>;
  onCueClick?: (time: number) => void;
}) {
  const { transcript, activeUtteranceIndex, isLoading } = useTranscript({
    url,
    playerRef,
  });

  if (isLoading) return <p className="text-muted">Loading transcript…</p>;
  if (!transcript) return null;
  console.log(activeUtteranceIndex);

  return (
    <TranscriptWrapper>
      <TranscriptHeader>
        <TranscriptTitle className="text-2xl font-bold">
          Transcript{" "}
          <span className="text-gray-400 text-sm">(auto-generated)</span>
        </TranscriptTitle>
      </TranscriptHeader>
      <TranscriptContent>
        {transcript.utterances.map((u, i) => (
          <UtteranceItem
            key={i}
            active={i === activeUtteranceIndex}
            onClick={() => onCueClick?.(u.start)}
          >
            <UtteranceLabel>
              <UtteranceSpeaker>
                {transcript.metadata.speakers[u.speaker] ??
                  `Speaker ${u.speaker}`}
              </UtteranceSpeaker>
              <UtteranceTime>{formatTimestamp(u.start)}</UtteranceTime>
            </UtteranceLabel>
            <Utterance
              className={`text-lg hover:bg-primary/10 ${
                i === activeUtteranceIndex ? "bg-primary/10" : ""
              }`}
            >
              {u.text}
            </Utterance>
          </UtteranceItem>
        ))}
      </TranscriptContent>
    </TranscriptWrapper>
  );
}
