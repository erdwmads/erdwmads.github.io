import { missionEntries } from "../../../data/missionLog";

const publicImagePath = (value: string) =>
  value.replaceAll("assets/img/grad-log-", "assets/img/mission-log/grad-log-");

const publishEntry = (entry: (typeof missionEntries)[number]) => {
  const json = JSON.stringify(entry);
  return JSON.parse(publicImagePath(json));
};

export function GET() {
  return new Response(
    JSON.stringify(missionEntries.map(publishEntry)),
    {
      headers: {
        "content-type": "application/json; charset=utf-8"
      }
    }
  );
}
