import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DatePicker } from "@mantine/dates";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const meta: Meta<typeof DatePicker> = {
  title: "Calendar/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof DatePicker>;

function DatePickerWithState() {
  const [value, setValue] = useState<Date | null>(null);
  return (
    <div className="space-y-2">
      <DatePicker value={value} onChange={setValue} />
      <p className="text-sm text-muted-foreground">
        Selected UTC: {value ? dayjs.utc(value).format("YYYY-MM-DD") : "none"}
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <DatePickerWithState />,
};
