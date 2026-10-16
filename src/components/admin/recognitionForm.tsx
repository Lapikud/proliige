"use client";

import { useState, type SubmitEvent } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { publishRecognitionAction } from "~/actions/recognition";
import type { RecognitionBadge } from "~/core/ports/recognition";
import { useAction } from "~/lib/form";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input, Label, Select, Textarea } from "~/components/ui/formControls";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { BadgeCreator } from "./badgeCreator";

interface Props {
  recipients: ReadonlyArray<{ id: string; displayName: string }>;
  badges: ReadonlyArray<RecognitionBadge>;
  onPublished?: () => void;
  onBadgeCreated?: (badge: RecognitionBadge) => void;
}

export function RecognitionForm({ recipients, badges, onPublished, onBadgeCreated }: Props) {
  const [availableBadges, setAvailableBadges] = useState([...badges]);
  const [recipientId, setRecipientId] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("5");
  const [badgeIds, setBadgeIds] = useState<Array<string>>([]);
  const [badgePickerOpen, setBadgePickerOpen] = useState(false);
  const [links, setLinks] = useState("");
  const action = useAction(publishRecognitionAction, {
    onSuccess: () => {
      setRecipientId("");
      setDescription("");
      setPoints("5");
      setBadgeIds([]);
      setLinks("");
      onPublished?.();
    },
  });

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedLinks = links
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("|");

        return separator < 0
          ? {
              title: line.slice(0, 100),
              url: line,
            }
          : {
              title: line.slice(0, separator).trim(),
              url: line.slice(separator + 1).trim(),
            };
      });
    action.run({
      recipientId,
      description,
      points: Number(points),
      badgeIds,
      links: parsedLinks,
    });
  };

  const addBadge = (badge: RecognitionBadge) => {
    setAvailableBadges((current) =>
      [...current, badge].sort((a, b) => a.label.localeCompare(b.label)),
    );
    setBadgeIds((current) => [...current, badge.id]);
    onBadgeCreated?.(badge);
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recognition-recipient">Recognize member</Label>
            <Select
              id="recognition-recipient"
              required
              value={recipientId}
              onChange={(event) => {
                setRecipientId(event.target.value);
              }}
            >
              <option value="">Choose an eligible member</option>
              {recipients.map((recipient) => (
                <option value={recipient.id} key={recipient.id}>
                  {recipient.displayName}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recognition-description">Contribution</Label>
            <Textarea
              id="recognition-description"
              required
              maxLength={2000}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder="Describe what they contributed and why it mattered."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recognition-points">Points</Label>
            <Input
              id="recognition-points"
              type="number"
              min="1"
              max="100000"
              step="1"
              required
              value={points}
              onChange={(event) => {
                setPoints(event.target.value);
              }}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold">Badges (optional)</legend>
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={badgePickerOpen} onOpenChange={setBadgePickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" disabled={availableBadges.length === 0}>
                    {badgeIds.length === 0
                      ? "Choose badges"
                      : `${badgeIds.length} badge${badgeIds.length === 1 ? "" : "s"} selected`}
                    <ChevronDown aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  role="group"
                  aria-label="Available badges"
                  className="max-h-64 w-72 gap-1 overflow-y-auto p-2"
                >
                  {availableBadges.map((badge) => (
                    <label
                      key={badge.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={badgeIds.includes(badge.id)}
                        onChange={(event) => {
                          setBadgeIds((current) =>
                            event.target.checked
                              ? [...current, badge.id]
                              : current.filter((id) => id !== badge.id),
                          );
                        }}
                      />
                      {badge.imageUrl ? (
                        <Image
                          src={badge.imageUrl}
                          alt=""
                          width={32}
                          height={32}
                          unoptimized
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <span aria-hidden="true" className="size-8 rounded-full bg-muted" />
                      )}
                      <span className="text-sm font-bold">{badge.label}</span>
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
              <BadgeCreator onCreated={addBadge} />
            </div>
            {badgeIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected:{" "}
                {availableBadges
                  .filter(({ id }) => badgeIds.includes(id))
                  .map(({ label }) => label)
                  .join(", ")}
              </p>
            )}
            {availableBadges.length === 0 && (
              <p className="text-sm text-muted-foreground">No saved badges yet. Add one below.</p>
            )}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recognition-links">Achievement links (optional)</Label>
            <Textarea
              id="recognition-links"
              value={links}
              onChange={(event) => {
                setLinks(event.target.value);
              }}
              placeholder={"One per line: https://example.com or Title | https://example.com"}
            />
          </div>
          {action.error && (
            <p role="alert" className="text-sm text-destructive">
              {action.error}
            </p>
          )}
          <Button type="submit" disabled={action.pending || recipients.length === 0}>
            {action.pending ? "Publishing…" : "Publish recognition"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
