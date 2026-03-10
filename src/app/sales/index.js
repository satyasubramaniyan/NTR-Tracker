import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Select, Row, Col, Statistic, Space, DatePicker, Button, Tag, message } from 'antd';
import { ShoppingCartOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './sales.module.scss';
import { formatINR, formatNumber } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function Sales() {
  const [filterType, setFilterType] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Extract sales data from customer transactions
  const extractSalesFromCustomers = () => {
    try {
      // Get customers from localStorage if available, otherwise use empty array
      const customersJSON = typeof window !== 'undefined' ? localStorage.getItem('ntrTrackerCustomers') : null;
      const customers = customersJSON ? JSON.parse(customersJSON) : [];

      const sales = [];
      let id = 1;

      customers.forEach((customer) => {
        if (customer.transactions && customer.transactions.length > 0) {
          customer.transactions.forEach((txn) => {
            if (txn.type === 'Purchase' && txn.item && txn.quantity) {
              sales.push({
                id: `${id}`,
                date: txn.date,
                customerName: customer.name,
                product: txn.item,
                quantity: txn.quantity,
                unit: txn.unit,
                rate: txn.rate,
                amount: txn.billAmount,
                receiptNo: txn.receiptNo,
              });
              id++;
            }
          });
        }
      });

      return sales;
    } catch (error) {
      console.error('Error extracting sales data:', error);
      return [];
    }
  };

  useEffect(() => {
    setLoading(true);
    try {
      const data = extractSalesFromCustomers();
      setSalesData(data);
    } catch (error) {
      console.error('Error loading sales data:', error);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter data based on filter type and date range
  const filteredData = useMemo(() => {
    let filtered = [...salesData];

    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      filtered = filtered.filter((item) => {
        const itemDate = dayjs(item.date, 'DD-MM-YYYY');
        return itemDate.isSameOrAfter(startDate.startOf('day')) && itemDate.isSameOrBefore(endDate.endOf('day'));
      });
    }

    if (filterType === 'year') {
      return filtered.reduce((acc, item) => {
        const year = dayjs(item.date, 'DD-MM-YYYY').format('YYYY');
        const existing = acc.find((row) => row.date === year && row.product === item.product);
        if (existing) {
          existing.quantity += item.quantity;
          existing.amount += item.amount;
        } else {
          acc.push({ ...item, date: year, isGrouped: true });
        }
        return acc;
      }, []);
    } else if (filterType === 'month') {
      return filtered.reduce((acc, item) => {
        const month = dayjs(item.date, 'DD-MM-YYYY').format('MMM YYYY');
        const existing = acc.find((row) => row.date === month && row.product === item.product);
        if (existing) {
          existing.quantity += item.quantity;
          existing.amount += item.amount;
        } else {
          acc.push({ ...item, date: month, isGrouped: true });
        }
        return acc;
      }, []);
    }

    return filtered;
  }, [salesData, filterType, dateRange]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = {
      totalChicken: 0,
      totalDuck: 0,
      totalEggs: 0,
      totalRevenue: 0,
      totalTransactions: 0,
    };

    filteredData.forEach((item) => {
      if (item.product === 'Chicken') {
        stats.totalChicken += item.quantity;
      } else if (item.product === 'Duck') {
        stats.totalDuck += item.quantity;
      } else if (item.product === 'Eggs') {
        stats.totalEggs += item.quantity;
      }
      stats.totalRevenue += item.amount;
      if (!item.isGrouped) {
        stats.totalTransactions += 1;
      }
    });

    return stats;
  }, [filteredData]);

  const columns = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => a.date.localeCompare(b.date),
      width: 130,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Receipt No',
      dataIndex: 'receiptNo',
      key: 'receiptNo',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Customer Name',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 200,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      filters: [
        { text: 'Chicken', value: 'Chicken' },
        { text: 'Duck', value: 'Duck' },
        { text: 'Eggs', value: 'Eggs' },
      ],
      onFilter: (value, record) => record.product === value,
      width: 120,
      render: (text) => {
        let color = 'default';
        if (text === 'Chicken') color = 'geekblue';
        if (text === 'Duck') color = 'cyan';
        if (text === 'Eggs') color = 'orange';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      align: 'right',
      render: (value, record) => `${formatNumber(value)} ${record.unit}`,
      width: 150,
    },
    {
      title: 'Rate (₹)',
      dataIndex: 'rate',
      key: 'rate',
      align: 'right',
      render: (value) => value ? formatINR(value) : '-',
      width: 120,
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => a.amount - b.amount,
      align: 'right',
      render: (value) => formatINR(value),
      width: 150,
    },
  ];

  const handleFilterChange = (value) => {
    if (value && typeof value === 'string') {
      setFilterType(value);
    }
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleClearFilters = () => {
    setFilterType(null);
    setDateRange(null);
  };

  const isFilterActive = filterType !== null || dateRange !== null;

  return (
    <div className={styles.salesContainer}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <h1 className={styles.pageTitle}>Sales Dashboard</h1>
          <p className={styles.pageDescription}>
            Track sales performance for chicken, duck, and eggs based on customer transactions.
          </p>
        </Card>

        <Card title="Filters" className={styles.filterCard}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <label className={styles.filterLabel}>Filter By:</label>
              <Select
                value={filterType}
                onChange={handleFilterChange}
                placeholder="Select filter type"
                style={{ width: '100%' }}
                size="large"
                allowClear
              >
                <Option value="year">Year</Option>
                <Option value="month">Month</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <label className={styles.filterLabel}>Date Range:</label>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                placeholder={['Start Date', 'End Date']}
                style={{ width: '100%' }}
                size="large"
                format="YYYY-MM-DD"
                allowClear
              />
            </Col>
            <Col xs={24} sm={24} md={4}>
              <label className={styles.filterLabel}>&nbsp;</label>
              <Button
                type="default"
                icon={<ClearOutlined />}
                onClick={handleClearFilters}
                size="large"
                block
                disabled={!isFilterActive}
                className={styles.clearButton}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Chicken Sold"
                value={summaryStats.totalChicken}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#3f8600' }}
                formatter={(value) => `${formatNumber(value)} kg`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Duck Sold"
                value={summaryStats.totalDuck}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
                formatter={(value) => `${formatNumber(value)} kg`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Eggs Sold"
                value={summaryStats.totalEggs}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#faad14' }}
                formatter={(value) => `${formatNumber(value)} pieces`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={summaryStats.totalRevenue}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#cf1322' }}
                formatter={(value) => formatNumber(value)}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Sales Details" className={styles.tableCard}>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col flex="auto">
              <Space>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  format="DD-MM-YYYY"
                  style={{ width: 300 }}
                />
                <Select
                  placeholder="Filter by product"
                  style={{ width: 200 }}
                  value={filterType}
                  onChange={setFilterType}
                  allowClear
                >
                  <Option value="Chicken">Chicken</Option>
                  <Option value="Duck">Duck</Option>
                  <Option value="Eggs">Eggs</Option>
                </Select>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => {
                  exportToExcel(
                    filteredData.map(item => ({
                      'Date': item.date,
                      'Receipt No': item.receiptNo,
                      'Customer': item.customerName,
                      'Product': item.product,
                      'Quantity': item.quantity,
                      'Unit': item.unit,
                      'Rate': item.rate,
                      'Amount': item.amount,
                    })),
                    'Sales_Details',
                    'Sales'
                  );
                  message.success('Sales report exported successfully!');
                }}
                disabled={filteredData.length === 0}
              >
                Export to Excel
              </Button>
            </Col>
          </Row>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} records`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 1300, y: 'calc(100vh - 300px)' }}
            bordered
          />
        </Card>
      </Space>
    </div>
  );
}