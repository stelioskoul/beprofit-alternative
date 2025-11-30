import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface TimezoneSelectorProps {
  storeId: number;
}

// Common timezones with their UTC offsets in minutes
const TIMEZONES = [
  { label: "UTC-12:00 (Baker Island)", value: 720 },
  { label: "UTC-11:00 (American Samoa)", value: 660 },
  { label: "UTC-10:00 (Hawaii)", value: 600 },
  { label: "UTC-09:00 (Alaska)", value: 540 },
  { label: "UTC-08:00 (Pacific Time)", value: 480 },
  { label: "UTC-07:00 (Mountain Time)", value: 420 },
  { label: "UTC-06:00 (Central Time)", value: 360 },
  { label: "UTC-05:00 (Eastern Time)", value: 300 },
  { label: "UTC-04:00 (Atlantic Time)", value: 240 },
  { label: "UTC-03:00 (Buenos Aires)", value: 180 },
  { label: "UTC-02:00 (Mid-Atlantic)", value: 120 },
  { label: "UTC-01:00 (Azores)", value: 60 },
  { label: "UTC+00:00 (London, Dublin)", value: 0 },
  { label: "UTC+01:00 (Paris, Berlin)", value: -60 },
  { label: "UTC+02:00 (Athens, Cairo)", value: -120 },
  { label: "UTC+03:00 (Moscow, Istanbul)", value: -180 },
  { label: "UTC+04:00 (Dubai)", value: -240 },
  { label: "UTC+05:00 (Karachi)", value: -300 },
  { label: "UTC+05:30 (India)", value: -330 },
  { label: "UTC+06:00 (Dhaka)", value: -360 },
  { label: "UTC+07:00 (Bangkok)", value: -420 },
  { label: "UTC+08:00 (Singapore, Beijing)", value: -480 },
  { label: "UTC+09:00 (Tokyo, Seoul)", value: -540 },
  { label: "UTC+10:00 (Sydney)", value: -600 },
  { label: "UTC+11:00 (Solomon Islands)", value: -660 },
  { label: "UTC+12:00 (New Zealand)", value: -720 },
];

export default function TimezoneSelector({ storeId }: TimezoneSelectorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState<number>(-300); // Default to EST

  const { data: store } = trpc.stores.getById.useQuery({ id: storeId });
  
  const updateStoreMutation = trpc.stores.update.useMutation({
    onSuccess: () => {
      toast.success("Timezone updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Set initial timezone from store data
  useEffect(() => {
    if (store?.timezoneOffset !== undefined && store.timezoneOffset !== null) {
      setSelectedTimezone(store.timezoneOffset);
    }
  }, [store]);

  const handleSave = () => {
    updateStoreMutation.mutate({
      id: storeId,
      timezoneOffset: selectedTimezone,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select
          value={selectedTimezone.toString()}
          onValueChange={(value) => setSelectedTimezone(parseInt(value))}
        >
          <SelectTrigger id="timezone">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value.toString()}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <p className="text-sm text-muted-foreground">
        This timezone will be used to determine the start and end of each day for your reports and analytics.
      </p>

      <Button onClick={handleSave} disabled={updateStoreMutation.isPending}>
        {updateStoreMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Timezone
      </Button>
    </div>
  );
}
