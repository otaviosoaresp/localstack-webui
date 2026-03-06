import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Table,
  Button,
  Input,
  Switch,
  Breadcrumb,
  Tag,
  Space,
  message,
} from "antd";
import { ReloadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { OutputLogEvent } from "@aws-sdk/client-cloudwatch-logs";
import { useConfig } from "../../config/ConfigContext";
import { getLogEvents } from "../../services/cloudwatch-service";

const { Title } = Typography;
const { Search } = Input;

interface DecodedParams {
  logGroupName: string;
  logStreamName: string;
}

function useDecodedParams(): DecodedParams {
  const { logGroupName, logStreamName } = useParams<{
    logGroupName: string;
    logStreamName: string;
  }>();
  return {
    logGroupName: decodeURIComponent(logGroupName ?? ""),
    logStreamName: decodeURIComponent(logStreamName ?? ""),
  };
}

function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toISOString().replace("T", " ").replace("Z", "");
}

export function LogStreamDetail() {
  const { logGroupName, logStreamName } = useDecodedParams();
  const navigate = useNavigate();
  const { config } = useConfig();

  const [events, setEvents] = useState<OutputLogEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getLogEvents(config, logGroupName, logStreamName);
      setEvents(result.events);
      setNextToken(result.nextForwardToken);
      setHasMore(result.events.length > 0);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load log events";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config, logGroupName, logStreamName]);

  const loadMoreEvents = useCallback(async () => {
    if (!nextToken) return;
    setLoading(true);
    try {
      const result = await getLogEvents(config, logGroupName, logStreamName, nextToken);
      const noNewEvents = result.nextForwardToken === nextToken || result.events.length === 0;
      if (noNewEvents) {
        setHasMore(false);
      } else {
        setEvents((prev) => [...prev, ...result.events]);
        setNextToken(result.nextForwardToken);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load more events";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [config, logGroupName, logStreamName, nextToken]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadEvents();
      }, 5000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, loadEvents]);

  function filteredEvents(): OutputLogEvent[] {
    if (!filterText) return events;
    const lowerFilter = filterText.toLowerCase();
    return events.filter((event) =>
      (event.message ?? "").toLowerCase().includes(lowerFilter)
    );
  }

  const columns: ColumnsType<OutputLogEvent> = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 240,
      render: (timestamp: number | undefined) => (
        <Tag color="blue">{formatTimestamp(timestamp)}</Tag>
      ),
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      render: (msg: string | undefined) => (
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 13 }}>
          {msg ?? ""}
        </pre>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: <a onClick={() => navigate("/cloudwatch")}>Log Groups</a>,
          },
          {
            title: (
              <a onClick={() => navigate(`/cloudwatch?logGroup=${encodeURIComponent(logGroupName)}`)}>
                {logGroupName}
              </a>
            ),
          },
          {
            title: logStreamName,
          },
        ]}
      />

      <Title level={3}>Log Events</Title>

      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }} size="middle">
        <Space size="middle">
          <Button icon={<ReloadOutlined />} onClick={loadEvents} loading={loading}>
            Refresh
          </Button>
          <Space>
            <span>Auto-refresh</span>
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              size="small"
            />
          </Space>
        </Space>
        <Search
          placeholder="Filter events by message..."
          allowClear
          onSearch={setFilterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ width: 320 }}
        />
      </Space>

      <Table<OutputLogEvent>
        columns={columns}
        dataSource={filteredEvents()}
        rowKey={(record, index) => `${record.timestamp}-${index}`}
        loading={loading}
        pagination={false}
        size="small"
        bordered
      />

      {hasMore && nextToken && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button onClick={loadMoreEvents} loading={loading}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
