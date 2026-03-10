import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Space, Button, Typography } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  RightOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import styles from './index.module.scss';
import { formatINR, formatNumber } from '../utils/formatters';
import { generateSalesData, calculateSummaryStats } from '../utils/salesUtils';
import { exportToExcel } from '../utils/excelExport';

const { Title, Paragraph, Text } = Typography;

export default function Home() {
  const router = useRouter();
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    try {
      const data = generateSalesData();
      setSalesData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const summaryStats = calculateSummaryStats(salesData);

  const recentSales = salesData
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(item => ({
      key: item.id,
      date: item.date,
      product: item.product,
      quantity: item.quantity,
      amount: item.amount,
    }));

  const dashboardCards = [
    {
      key: 'sales',
      title: 'Sales Overview',
      icon: <ShoppingCartOutlined style={{ fontSize: 40, color: '#1890ff' }} />,
      stats: [
        { label: 'Total Revenue', value: formatINR(summaryStats.totalRevenue), trend: 15.3 },
        { label: 'Chicken Sold', value: formatNumber(summaryStats.totalChicken) },
        { label: 'Duck Sold', value: formatNumber(summaryStats.totalDuck) },
        { label: 'Eggs Sold', value: formatNumber(summaryStats.totalEggs) },
      ],
      route: '/sales',
      color: '#1890ff',
    },
    {
      key: 'purchase',
      title: 'Purchase Overview',
      icon: <DollarOutlined style={{ fontSize: 40, color: '#52c41a' }} />,
      stats: [
        { label: 'Total Purchase', value: formatINR(450000), trend: -5.2 },
        { label: 'Pending Orders', value: '12' },
        { label: 'Completed', value: '145' },
        { label: 'This Month', value: formatINR(85000) },
      ],
      route: '/purchase',
      color: '#52c41a',
    },
    {
      key: 'customers',
      title: 'Customer Overview',
      icon: <UserOutlined style={{ fontSize: 40, color: '#faad14' }} />,
      stats: [
        { label: 'Total Customers', value: '248', trend: 8.5 },
        { label: 'Active', value: '195' },
        { label: 'New This Month', value: '23' },
        { label: 'Repeat Rate', value: '68%' },
      ],
      route: '/customers',
      color: '#faad14',
    },
  ];

  const handleCardClick = (route) => {
    if (route) {
      router.push(route);
    }
  };

  const salesColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      width: 100,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      render: (value) => formatNumber(value),
      width: 100,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (value) => formatINR(value),
      width: 120,
    },
  ];

  const renderTrendIcon = (trend) => {
    if (!trend) return null;

    const isPositive = trend > 0;
    return (
      <Text type={isPositive ? 'success' : 'danger'}>
        {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {Math.abs(trend)}%
      </Text>
    );
  };

  return (
    <div className={styles.homeContainer}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Card className={styles.welcomeCard}>
          <Title level={2} className={styles.welcomeTitle}>
            Welcome to NTR Tracker
          </Title>
          <Paragraph className={styles.welcomeText}>
            Track and manage your poultry sales, purchases, and customer data efficiently.
          </Paragraph>
        </Card>

        <Row gutter={[24, 24]}>
          {dashboardCards.map((card) => (
            <Col xs={24} lg={8} key={card.key}>
              <Card
                hoverable
                className={styles.dashboardCard}
                onClick={() => handleCardClick(card.route)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon}>{card.icon}</div>
                  <Title level={4} className={styles.cardTitle}>
                    {card.title}
                  </Title>
                </div>

                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                  {card.stats.map((stat, index) => (
                    <div key={index} className={styles.statItem}>
                      <div className={styles.statLabel}>{stat.label}</div>
                      <div className={styles.statValue}>
                        <Text strong style={{ fontSize: 18 }}>
                          {stat.value}
                        </Text>
                        {stat.trend && (
                          <span className={styles.statTrend}>
                            {renderTrendIcon(stat.trend)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </Space>

                <Button
                  type="link"
                  icon={<RightOutlined />}
                  className={styles.viewMoreBtn}
                  style={{ color: card.color }}
                >
                  View Details
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
        <Card
          title="Recent Sales Activity"
          className={styles.recentSalesCard}
          extra={
            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => {
                  exportToExcel(
                    salesData.map(item => ({
                      'Date': item.date,
                      'Product': item.product,
                      'Quantity': item.quantity,
                      'Amount': item.amount,
                    })),
                    'Sales_Report',
                    'Sales'
                  );
                }}
              >
                Export
              </Button>
              <Button type="link" onClick={() => router.push('/sales')}>
                View All
              </Button>
            </Space>
          }
        >
          <Table
            columns={salesColumns}
            dataSource={recentSales}
            loading={loading}
            pagination={false}
            size="small"
            bordered
          />
        </Card>
      </Space>
    </div>
  );
}
