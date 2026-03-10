import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Row, Col, Statistic, DatePicker, message, Modal, Form, Input, InputNumber, Select, Tag } from 'antd';
import { PlusOutlined, ShoppingOutlined, CheckCircleOutlined, ClockCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import styles from './purchase.module.scss';
import { formatINR, formatNumber } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';

const { RangePicker } = DatePicker;

export default function Purchase() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const suppliers = ['ABC Farms', 'XYZ Poultry', 'Green Valley', 'Fresh Farms', 'Nature Foods'];
  const items = ['Chicken', 'Duck', 'Eggs', 'Feed', 'Medicine'];

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/purchases');
      if (response.ok) {
        const data = await response.json();
        setPurchases(data.data || []);
      } else {
        console.error('Error fetching purchases:', response.statusText);
        message.error('Failed to load purchases');
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      message.error('Error loading purchases');
    } finally {
      setLoading(false);
    }
  };

  const generateNextPONumber = () => {
    if (purchases.length === 0) return 'PO00001';
    // Find the highest PO number
    const numbers = purchases
      .map(p => {
        const match = (p.poNumber || p._id || '').match(/PO(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .sort((a, b) => b - a);
    const nextNumber = (numbers[0] || 0) + 1;
    return `PO${String(nextNumber).padStart(5, '0')}`;
  };

  const handleAddPurchase = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const poNumber = generateNextPONumber();
      const totalAmount = values.quantity * values.unitPrice;

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poNumber,
          date: values.date.format('YYYY-MM-DD'),
          supplier: values.supplier,
          item: values.item,
          quantity: values.quantity,
          unitPrice: values.unitPrice,
          totalAmount: totalAmount,
          status: values.status || 'Pending',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        message.success('Purchase order added successfully!');
        setIsModalVisible(false);
        form.resetFields();
        fetchPurchases(); // Refresh the list
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to add purchase order');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      message.error('Please fill all required fields correctly');
    }
  };

  const filteredPurchases = dateRange
    ? purchases.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= dateRange[0] && purchaseDate <= dateRange[1];
      })
    : purchases;

  const summaryStats = {
    total: filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
    pending: filteredPurchases.filter(p => p.status === 'Pending').length,
    completed: filteredPurchases.filter(p => p.status === 'Completed').length,
    processing: filteredPurchases.filter(p => p.status === 'Processing').length,
  };

  const columns = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      width: 120,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => a.date.localeCompare(b.date),
      width: 120,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
      filters: Array.from(new Set(purchases.map(p => p.supplier))).map(supplier => ({
        text: supplier,
        value: supplier,
      })),
      onFilter: (value, record) => record.supplier === value,
      width: 170,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Item',
      dataIndex: 'item',
      key: 'item',
      filters: Array.from(new Set(purchases.map(p => p.item))).map(item => ({
        text: item,
        value: item,
      })),
      onFilter: (value, record) => record.item === value,
      width: 120,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      align: 'right',
      render: (value) => formatNumber(value),
      width: 100,
    },
    {
      title: 'Unit Price (₹)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      render: (value) => formatINR(value),
      width: 120,
    },
    {
      title: 'Total Amount (₹)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      sorter: (a, b) => a.totalAmount - b.totalAmount,
      align: 'right',
      render: (value) => formatINR(value),
      width: 150,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Completed', value: 'Completed' },
        { text: 'Pending', value: 'Pending' },
        { text: 'Processing', value: 'Processing' },
        { text: 'Cancelled', value: 'Cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        const colorMap = {
          Completed: 'green',
          Pending: 'orange',
          Processing: 'blue',
          Cancelled: 'red',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
      width: 120,
    },
  ];

  return (
    <div className={styles.purchaseContainer}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <h1 className={styles.pageTitle}>Purchase Management</h1>
              <p className={styles.pageDescription}>
                Manage and track your purchase orders and inventory.
              </p>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleAddPurchase}>
                New Purchase Order
              </Button>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Purchase Value"
                value={summaryStats.total}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#3f8600' }}
                formatter={(value) => formatNumber(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pending Orders"
                value={summaryStats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Processing"
                value={summaryStats.processing}
                prefix={<ShoppingOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed"
                value={summaryStats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Purchase Orders">
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col flex="auto">
                <RangePicker
                  onChange={setDateRange}
                  style={{ width: 300 }}
                  format="YYYY-MM-DD"
                  allowClear
                />
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    exportToExcel(
                      filteredPurchases.map(item => ({
                        'PO Number': item.id,
                        'Date': item.date,
                        'Supplier': item.supplier,
                        'Item': item.item,
                        'Quantity': item.quantity,
                        'Unit Price': item.unitPrice,
                        'Total Amount': item.totalAmount,
                        'Status': item.status,
                      })),
                      'Purchase_Orders',
                      'Purchase'
                    );
                    message.success('Purchase orders exported successfully!');
                  }}
                  disabled={filteredPurchases.length === 0}
                >
                  Export to Excel
                </Button>
              </Col>
            </Row>

            <Table
              columns={columns}
              dataSource={filteredPurchases.map(item => ({
                ...item,
                key: item._id || item.poNumber,
              }))}
              rowKey="key"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} orders`,
                pageSizeOptions: ['10', '20', '50'],
              }}
              scroll={{ x: 1300, y: 'calc(100vh - 300px)' }}
              bordered
            />
          </Space>
        </Card>
      </Space>
      <Modal
        title="Add New Purchase Order"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="Add Purchase"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="Date"
            name="date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Supplier"
            name="supplier"
            rules={[{ required: true, message: 'Please select supplier' }]}
          >
            <Select placeholder="Select supplier">
              {suppliers.map(supplier => (
                <Select.Option key={supplier} value={supplier}>
                  {supplier}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Item"
            name="item"
            rules={[{ required: true, message: 'Please select item' }]}
          >
            <Select placeholder="Select item">
              {items.map(item => (
                <Select.Option key={item} value={item}>
                  {item}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Quantity"
            name="quantity"
            rules={[
              { required: true, message: 'Please enter quantity' },
              { type: 'number', min: 1, message: 'Quantity must be greater than 0' }
            ]}
          >
            <InputNumber placeholder="Enter quantity" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Unit Price (₹)"
            name="unitPrice"
            rules={[
              { required: true, message: 'Please enter unit price' },
              { type: 'number', min: 0, message: 'Unit price must be valid' }
            ]}
          >
            <InputNumber placeholder="Enter unit price" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            initialValue="Pending"
          >
            <Select>
              <Select.Option value="Pending">Pending</Select.Option>
              <Select.Option value="Processing">Processing</Select.Option>
              <Select.Option value="Completed">Completed</Select.Option>
              <Select.Option value="Cancelled">Cancelled</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
