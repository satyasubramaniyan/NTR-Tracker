import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Input, Row, Col, Modal, Form, message, Descriptions, Select, InputNumber, DatePicker, Divider } from 'antd';
import { UserAddOutlined, SearchOutlined, PhoneOutlined, EyeOutlined, PlusOutlined, DollarOutlined, MinusCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './customers.module.scss';
import { formatINR, formatNumber } from '../../utils/formatters';
import { exportCustomersToExcel } from '../../utils/excelExport';
import { apiClient } from '../../utils/apiClient';

const { Search } = Input;

// Helper function to generate transactions for a customer
const generateTransactions = (customerId) => {
  // Generate a mix of payment and purchase transactions
  const transactions = [];
  let currentBalance = 4821; // Starting balance
  const baseReceiptNo = 5065 + customerId * 100;
  const items = [
    { name: 'Chicken', unit: 'kg' },
    { name: 'Duck', unit: 'kg' },
    { name: 'Eggs', unit: 'pieces' },
  ];

  // Transaction 1: Payment
  transactions.push({
    id: `${baseReceiptNo}`,
    receiptNo: `${baseReceiptNo}`,
    date: '05-01-2026',
    type: 'Payment',
    item: null,
    quantity: null,
    unit: null,
    rate: null,
    amountReceived: 4000.00,
    billAmount: null,
    previousBalance: currentBalance,
    totalOutstanding: currentBalance - 4000.00,
  });
  currentBalance = currentBalance - 4000.00;

  // Transaction 2: Purchase
  const item1 = items[0];
  const quantity1 = 57.5;
  const rate1 = 156.000;
  const billAmount1 = quantity1 * rate1;
  transactions.push({
    id: `${baseReceiptNo + 1}`,
    receiptNo: `${baseReceiptNo + 1}`,
    date: '11-01-2026',
    type: 'Purchase',
    item: item1.name,
    quantity: quantity1,
    unit: item1.unit,
    rate: rate1,
    amountReceived: null,
    billAmount: billAmount1,
    previousBalance: currentBalance,
    totalOutstanding: currentBalance + billAmount1,
  });
  currentBalance = currentBalance + billAmount1;

  // Transaction 3: Payment
  transactions.push({
    id: `${baseReceiptNo + 2}`,
    receiptNo: `${baseReceiptNo + 2}`,
    date: '12-01-2026',
    type: 'Payment',
    item: null,
    quantity: null,
    unit: null,
    rate: null,
    amountReceived: 8000.00,
    billAmount: null,
    previousBalance: currentBalance,
    totalOutstanding: currentBalance - 8000.00,
  });
  currentBalance = currentBalance - 8000.00;

  // Transaction 4: Purchase
  const item2 = items[0];
  const quantity2 = 20.85;
  const rate2 = 159.000;
  const billAmount2 = quantity2 * rate2;
  transactions.push({
    id: `${baseReceiptNo + 3}`,
    receiptNo: `${baseReceiptNo + 3}`,
    date: '16-01-2026',
    type: 'Purchase',
    item: item2.name,
    quantity: quantity2,
    unit: item2.unit,
    rate: rate2,
    amountReceived: null,
    billAmount: billAmount2,
    previousBalance: currentBalance,
    totalOutstanding: currentBalance + billAmount2,
  });
  currentBalance = currentBalance + billAmount2;

  // Transaction 5: Purchase
  const item3 = items[0];
  const quantity3 = 178.3;
  const rate3 = 159.000;
  const billAmount3 = quantity3 * rate3;
  transactions.push({
    id: `${baseReceiptNo + 4}`,
    receiptNo: `${baseReceiptNo + 4}`,
    date: '17-01-2026',
    type: 'Purchase',
    item: item3.name,
    quantity: quantity3,
    unit: item3.unit,
    rate: rate3,
    amountReceived: null,
    billAmount: billAmount3,
    previousBalance: currentBalance,
    totalOutstanding: currentBalance + billAmount3,
  });

  return transactions;
};

// Helper function to generate mock customers
const generateMockCustomers = () => {
  const names = ['AGR வாடிக்கையாளர்', 'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy'];
  const villages = ['NEW INDIAN', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai'];

  return Array.from({ length: 20 }, (_, i) => {
    const transactions = generateTransactions(i);
    const firstTransaction = transactions[0];
    const lastTransaction = transactions[transactions.length - 1];

    return {
      id: `${1001 + i}`,
      name: names[i % names.length],
      phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      village: villages[i % villages.length],
      oldBalance: firstTransaction.previousBalance, // Opening balance from first transaction
      currentBalance: lastTransaction.totalOutstanding - firstTransaction.previousBalance, // Change during period
      totalBalance: lastTransaction.totalOutstanding, // Current outstanding
      status: Math.random() > 0.3 ? 'Active' : 'Inactive',
      joinDate: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      transactions: transactions,
    };
  });
};

// Helper function to send SMS
const sendSMS = async (phoneNumber, message) => {
  try {
    // Call backend SMS API
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      console.error('SMS sending failed:', response.statusText);
      return false;
    }

    const data = await response.json();
    console.log('SMS sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

// Helper function to generate SMS message
const generateSMSMessage = (transactionType, customerName, customerVillage, receiptNo, date, transactionDetails) => {
  if (transactionType === 'Purchase') {
    const { item, quantity, unit, rate, previousBalance, billAmount, totalOutstanding } = transactionDetails;
    return `Receipt No: ${receiptNo}, Date: ${date}. ${item} quantity: ${quantity} ${unit}, Rate: ${rate}, Previous due: ${previousBalance}, Today's bill: ${billAmount}, Total outstanding: ${totalOutstanding}.`;
  } else {
    // For Payment: Enhanced message with paid amount details
    const { openingBalance, amountReceived, totalDue } = transactionDetails;
    return `Receipt No: ${receiptNo}, Date: ${date}. Previous balance: ₹${openingBalance}, Amount paid today: ₹${amountReceived}, Remaining due: ₹${totalDue}. Thank you!`;
  }
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactionType, setTransactionType] = useState('Purchase');
  const [form] = Form.useForm();
  const [transactionForm] = Form.useForm();

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const result = await apiClient.getCustomers();
        if (result.success) {
          setCustomers(result.data);
        } else {
          console.log('API returned no success flag, loading mock data');
          const mockCustomers = generateMockCustomers();
          setCustomers(mockCustomers);
          message.warning(
            'MongoDB not configured. Using mock data. ' +
            'See MONGODB_SETUP.md for setup instructions.'
          );
        }
      } catch (error) {
        console.error('Error loading customers:', error.message);
        const mockCustomers = generateMockCustomers();
        setCustomers(mockCustomers);
        message.warning(
          'Could not connect to database. Using mock data. ' +
          'To persist data, set up MongoDB by following MONGODB_SETUP.md'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleAddCustomer = () => {
    setIsModalOpen(true);
    form.resetFields();
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      try {
        const result = await apiClient.createCustomer({
          name: values.name,
          phone: values.phone,
          village: values.village,
          status: 'Active',
        });

        if (result.success) {
          setCustomers([result.data, ...customers]);
          message.success(`Customer ${values.name} added successfully!`);
        } else {
          // Fallback to local state if API fails
          throw new Error(result.error || 'API failed');
        }
      } catch (apiError) {
        console.log('API error, adding customer to local state:', apiError.message);
        // Add customer to local state as fallback
        const newCustomer = {
          _id: Date.now().toString(),
          name: values.name,
          phone: values.phone,
          village: values.village,
          status: 'Active',
          oldBalance: 0,
          currentBalance: 0,
          totalBalance: 0,
          transactions: [],
        };
        setCustomers([newCustomer, ...customers]);
        message.warning(
          `Customer ${values.name} added locally. Database not connected - data will not persist.`
        );
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
      message.error('Please fill in all required fields');
    }
  };

  const handleViewTransactions = (customer) => {
    setSelectedCustomer(customer);
    setIsTransactionModalOpen(true);
  };

  const handleAddTransaction = (customer) => {
    setSelectedCustomer(customer);
    setTransactionType('Purchase');
    setIsAddTransactionModalOpen(true);
    transactionForm.resetFields();
    transactionForm.setFieldsValue({
      date: dayjs(),
      type: 'Purchase',
      items: [{ item: undefined, quantity: undefined, rate: undefined }],
      paymentAmount: 0,
    });
  };

  const handleTransactionModalCancel = () => {
    setIsAddTransactionModalOpen(false);
    transactionForm.resetFields();
  };

  const handleTransactionModalOk = async () => {
    try {
      const values = await transactionForm.validateFields();
      const customer = customers.find(c => c._id === selectedCustomer._id);

      if (!customer) return;

      let previousBalance = customer.totalBalance || 0;
      let newTotalOutstanding = previousBalance;
      let transactionData = {
        type: values.type,
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
      };

      if (values.type === 'Purchase') {
        let billAmount = 0;
        values.items?.forEach((item) => {
          billAmount += item.quantity * item.rate;
        });

        transactionData.itemDetails = values.items?.map(i => `${i.quantity} ${i.item} @ ₹${i.rate}`).join(', ') || '';
        transactionData.todaysBill = billAmount;
        transactionData.previousBalance = previousBalance;
        newTotalOutstanding = previousBalance + billAmount;
        transactionData.totalOutstanding = newTotalOutstanding;

        if (values.paymentAmount > 0) {
          newTotalOutstanding = newTotalOutstanding - values.paymentAmount;
          transactionData.amountReceived = values.paymentAmount;
        }
      } else {
        transactionData.amountReceived = values.amountReceived || 0;
        transactionData.previousBalance = previousBalance;
        newTotalOutstanding = previousBalance - (values.amountReceived || 0);
        transactionData.totalOutstanding = newTotalOutstanding;
      }

      let updatedCustomer = { ...customer };

      try {
        // Try to add transaction via API
        const result = await apiClient.addTransaction(customer._id, transactionData);

        if (result.success) {
          updatedCustomer = result.data;
        } else {
          throw new Error(result.error || 'API failed');
        }
      } catch (apiError) {
        console.log('API error, adding transaction locally:', apiError.message);
        // Fallback: add transaction to local state
        const newTransaction = {
          _id: Date.now().toString(),
          ...transactionData,
        };
        updatedCustomer.transactions = updatedCustomer.transactions || [];
        updatedCustomer.transactions.push(newTransaction);
        updatedCustomer.oldBalance = customer.oldBalance || 0;
        updatedCustomer.currentBalance = newTotalOutstanding;
        updatedCustomer.totalBalance = newTotalOutstanding;
      }

      const updatedCustomers = customers.map(c =>
        c._id === customer._id ? updatedCustomer : c
      );
      setCustomers(updatedCustomers);
      setSelectedCustomer(updatedCustomer);

      message.success(`${values.type} transaction added successfully!`);

      // Send SMS notification
      const smsMessage = generateSMSMessage(
        values.type,
        updatedCustomer.name,
        updatedCustomer.village,
        'TXN',
        values.date?.format('DD-MM-YYYY') || dayjs().format('DD-MM-YYYY'),
        {
          previousBalance: transactionData.previousBalance,
          amountReceived: transactionData.amountReceived,
          todaysBill: transactionData.todaysBill,
          totalOutstanding: newTotalOutstanding,
        }
      );

      await sendSMS(updatedCustomer.phone, smsMessage);
      message.info('SMS sent to customer');

      setIsAddTransactionModalOpen(false);
      transactionForm.resetFields();
    } catch (error) {
      console.error('Error adding transaction:', error);
      message.error('Failed to add transaction: ' + error.message);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
    customer.phone.includes(searchText) ||
    customer.village.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Customer ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 200,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => (
        <span className={styles.textTruncate}>
          {phone}
        </span>
      ),
      width: 130,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Village',
      dataIndex: 'village',
      key: 'village',
      filters: Array.from(new Set(customers.map(c => c.village))).map(village => ({
        text: village,
        value: village,
      })),
      onFilter: (value, record) => record.village === value,
      width: 110,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Old Balance (₹)',
      dataIndex: 'oldBalance',
      key: 'oldBalance',
      sorter: (a, b) => a.oldBalance - b.oldBalance,
      align: 'right',
      render: (value) => formatINR(value),
      width: 130,
    },
    {
      title: 'Current Balance (₹)',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      sorter: (a, b) => a.currentBalance - b.currentBalance,
      align: 'right',
      render: (value) => formatINR(value),
      width: 150,
    },
    {
      title: 'Total Balance (₹)',
      dataIndex: 'totalBalance',
      key: 'totalBalance',
      sorter: (a, b) => a.totalBalance - b.totalBalance,
      align: 'right',
      render: (value) => (
        <Tag color={value > 0 ? 'red' : 'green'}>
          {formatINR(value)}
        </Tag>
      ),
      width: 140,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Inactive', value: 'Inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>{status}</Tag>
      ),
      width: 100,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="middle" direction="horizontal">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewTransactions(record)}
            title="View Transactions"
          >
            View
          </Button>
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => handleAddTransaction(record)}
            title="Add Transaction"
          >
            Add
          </Button>
        </Space>
      ),
      width: 150,
    },
  ];

  const transactionColumns = [
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
      width: 100,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Receipt No',
      dataIndex: 'receiptNo',
      key: 'receiptNo',
      width: 100,
      ellipsis: { showTitle: false },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'Payment' ? 'green' : 'blue'}>{type}</Tag>
      ),
    },
    {
      title: 'Item Details',
      key: 'itemDetails',
      width: 200,
      render: (_, record) => {
        if (record.type === 'Purchase') {
          return (
            <div>
              <div><strong>{record.item}</strong></div>
              <div className={styles.textSmallAccent}>
                Quantity: {record.quantity} {record.unit}
              </div>
              <div className={styles.textSmallAccent}>
                Rate: {formatINR(record.rate)}
              </div>
            </div>
          );
        }
        return <span className={styles.textDisabled}>-</span>;
      },
    },
    {
      title: 'Amount Received (₹)',
      dataIndex: 'amountReceived',
      key: 'amountReceived',
      align: 'right',
      width: 150,
      render: (value, record) => {
        if (record.type === 'Payment') {
          return <Tag color="green">{formatINR(value)}</Tag>;
        }
        return <span className={styles.textDisabled}>-</span>;
      },
    },
    {
      title: "Today's Bill (₹)",
      dataIndex: 'billAmount',
      key: 'billAmount',
      align: 'right',
      width: 140,
      render: (value, record) => {
        if (record.type === 'Purchase') {
          return <Tag color="orange">{formatINR(value)}</Tag>;
        }
        return <span className={styles.textDisabled}>-</span>;
      },
    },
    {
      title: 'Previous Balance (₹)',
      dataIndex: 'previousBalance',
      key: 'previousBalance',
      align: 'right',
      width: 150,
      render: (value) => formatINR(value),
    },
    {
      title: 'Total Outstanding (₹)',
      dataIndex: 'totalOutstanding',
      key: 'totalOutstanding',
      align: 'right',
      width: 160,
      render: (value) => (
        <Tag color={value > 0 ? 'red' : 'green'}>
          <strong>{formatINR(value)}</strong>
        </Tag>
      ),
    },
  ];

  return (
    <div className={styles.customersContainer}>
      <Space orientation="vertical" size="large" className={styles.fullWidth}>
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <h1 className={styles.pageTitle}>Customer Management</h1>
              <p className={styles.pageDescription}>
                Manage customer accounts with balance tracking and transaction history.
              </p>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                size="large"
                onClick={handleAddCustomer}
              >
                Add Customer
              </Button>
            </Col>
          </Row>
        </Card>

        <Card>
          <Space orientation="vertical" size="middle" className={styles.fullWidth}>
            <Row gutter={[16, 16]}>
              <Col flex="auto">
                <Search
                  placeholder="Search by name, phone, or village"
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="large"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className={styles.searchInput}
                />
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  size="large"
                  onClick={() => {
                    exportCustomersToExcel(customers);
                    message.success('Excel file downloaded successfully!');
                  }}
                  disabled={customers.length === 0}
                >
                  Export to Excel
                </Button>
              </Col>
            </Row>

            <Table
              columns={columns}
              dataSource={filteredCustomers}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} customers`,
                pageSizeOptions: ['10', '20', '50'],
              }}
              scroll={{ x: 1600, y: 'calc(100vh - 300px)' }}
              bordered
            />
          </Space>
        </Card>
      </Space>

      <Modal
        title="Add New Customer"
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={500}
        okText="Add Customer"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          className={styles.marginTop20}
        >
          <Form.Item
            label="Customer Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter customer name' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input placeholder="Enter customer name" size="large" />
          </Form.Item>

          <Form.Item
            label="Phone Number"
            name="phone"
            rules={[
              { required: true, message: 'Please enter phone number' },
              { pattern: /^[0-9+\s-]+$/, message: 'Please enter valid phone number' },
            ]}
          >
            <Input placeholder="+91 1234567890" size="large" />
          </Form.Item>

          <Form.Item
            label="Village/City"
            name="village"
            rules={[
              { required: true, message: 'Please enter village or city name' },
            ]}
          >
            <Input placeholder="Enter village or city" size="large" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Transaction History - ${selectedCustomer?.name || ''}`}
        open={isTransactionModalOpen}
        onCancel={() => setIsTransactionModalOpen(false)}
        width={1000}
        footer={[
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setIsTransactionModalOpen(false);
              handleAddTransaction(selectedCustomer);
            }}
          >
            Order Now
          </Button>,
          <Button key="close" onClick={() => setIsTransactionModalOpen(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedCustomer && (
          <Space orientation="vertical" size="large" className={styles.fullWidth}>
            <Card size="small">
              <Descriptions column={3} bordered size="small">
                <Descriptions.Item label="Customer ID">
                  {selectedCustomer.id}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {selectedCustomer.phone}
                </Descriptions.Item>
                <Descriptions.Item label="Village">
                  {selectedCustomer.village}
                </Descriptions.Item>
                <Descriptions.Item label="Old Balance">
                  <Tag color="orange">{formatINR(selectedCustomer.oldBalance)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Current Balance">
                  <Tag color="blue">{formatINR(selectedCustomer.currentBalance)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Total Balance">
                  <Tag color={selectedCustomer.totalBalance > 0 ? 'red' : 'green'}>
                    {formatINR(selectedCustomer.totalBalance)}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Table
              columns={transactionColumns}
              dataSource={selectedCustomer.transactions}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 900 }}
              bordered
            />
          </Space>
        )}
      </Modal>

      <Modal
        title={`Order now - ${selectedCustomer?.name || ''}`}
        open={isAddTransactionModalOpen}
        onOk={handleTransactionModalOk}
        onCancel={handleTransactionModalCancel}
        width={800}
        okText={transactionType === 'Purchase' ? 'Buy Now' : 'Pay Now'}
        cancelText="Cancel"
      >
        <Form
          form={transactionForm}
          layout="vertical"
          className={styles.marginTop20}
          onValuesChange={(changedValues) => {
            if (changedValues.type) {
              setTransactionType(changedValues.type);
            }
          }}
        >
          <Form.Item
            label="Transaction Type"
            name="type"
            initialValue="Purchase"
            rules={[{ required: true, message: 'Please select transaction type' }]}
          >
            <Select size="large">
              <Select.Option value="Purchase">Purchase</Select.Option>
              <Select.Option value="Payment">Payment</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Date"
            name="date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker
              size="large"
              className={styles.fullWidth}
              format="DD-MM-YYYY"
            />
          </Form.Item>

          {transactionType === 'Purchase' ? (
            <>
              <Divider orientation="left">Items</Divider>
              <Form.List name="items">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <Card
                        key={key}
                        size="small"
                        className={`${styles.marginBottom16} ${styles.cardItemHeader}`}
                        title={`Item ${index + 1}`}
                        extra={
                          fields.length > 1 ? (
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(name)}
                            >
                              Remove
                            </Button>
                          ) : null
                        }
                      >
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item
                              {...restField}
                              name={[name, 'item']}
                              label="Item"
                              rules={[{ required: true, message: 'Select item' }]}
                            >
                              <Select placeholder="Select item">
                                <Select.Option value="Chicken">Chicken</Select.Option>
                                <Select.Option value="Duck">Duck</Select.Option>
                                <Select.Option value="Eggs">Eggs</Select.Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              {...restField}
                              name={[name, 'quantity']}
                              label="Quantity"
                              rules={[
                                { required: true, message: 'Enter quantity' },
                                { type: 'number', min: 0.01, message: 'Must be > 0' }
                              ]}
                            >
                              <InputNumber
                                className={styles.fullWidth}
                                placeholder="Quantity"
                                precision={2}
                                min={0.01}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              {...restField}
                              name={[name, 'rate']}
                              label="Rate (₹)"
                              rules={[
                                { required: true, message: 'Enter rate' },
                                { type: 'number', min: 0.01, message: 'Must be > 0' }
                              ]}
                            >
                              <InputNumber
                                className={styles.fullWidth}
                                placeholder="Rate"
                                precision={3}
                                min={0.01}
                                prefix="₹"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prevValues, currentValues) => {
                            const prevItem = prevValues.items?.[name];
                            const currItem = currentValues.items?.[name];
                            return prevItem?.quantity !== currItem?.quantity ||
                                   prevItem?.rate !== currItem?.rate;
                          }}
                        >
                          {({ getFieldValue }) => {
                            const items = getFieldValue('items') || [];
                            const currentItem = items[name];
                            const quantity = currentItem?.quantity || 0;
                            const rate = currentItem?.rate || 0;
                            const amount = quantity * rate;
                            const itemName = currentItem?.item || '';
                            const unit = itemName === 'Eggs' ? 'pieces' : 'kg';

                            return amount > 0 ? (
                              <div className={styles.cardItemSection}>
                                <div className={styles.flexBetween}>
                                  <span>{quantity} {unit} × ₹{rate.toFixed(3)} =</span>
                                  <strong className={styles.textPrimary}>{formatINR(amount)}</strong>
                                </div>
                              </div>
                            ) : null;
                          }}
                        </Form.Item>
                      </Card>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<PlusOutlined />}
                      >
                        Add Another Item
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.items !== currentValues.items ||
                  prevValues.paymentAmount !== currentValues.paymentAmount
                }
              >
                {({ getFieldValue }) => {
                  const items = getFieldValue('items') || [];
                  const totalBillAmount = items.reduce((sum, item) => {
                    const quantity = item?.quantity || 0;
                    const rate = item?.rate || 0;
                    return sum + (quantity * rate);
                  }, 0);
                  const paymentAmount = getFieldValue('paymentAmount') || 0;

                  return totalBillAmount > 0 ? (
                    <Card size="small" className={styles.cardBillSummary}>
                      <Space orientation="vertical" className={styles.fullWidth}>
                        <div className={styles.flexBetween}>
                          <span>Total Bill Amount:</span>
                          <strong className={`${styles.textLarge} ${styles.textPrimary}`}>
                            {formatINR(totalBillAmount)}
                          </strong>
                        </div>
                        <div className={styles.flexBetween}>
                          <span>Previous Balance:</span>
                          <span>{formatINR(selectedCustomer?.totalBalance || 0)}</span>
                        </div>
                        {paymentAmount > 0 && (
                          <div className={`${styles.flexBetween} ${styles.textSuccess}`}>
                            <span>Payment Received:</span>
                            <span>- {formatINR(paymentAmount)}</span>
                          </div>
                        )}
                        <div className={`${styles.flexBetween} ${styles.dividerTop}`}>
                          <span><strong>Total Outstanding:</strong></span>
                          <strong className={`${styles.textLarge} ${styles.textDanger}`}>
                            {formatINR((selectedCustomer?.totalBalance || 0) + totalBillAmount - paymentAmount)}
                          </strong>
                        </div>
                      </Space>
                    </Card>
                  ) : null;
                }}
              </Form.Item>

              <Divider orientation="left">Payment (Optional)</Divider>
              <Form.Item
                label="Amount Received (₹)"
                name="paymentAmount"
                rules={[
                  { type: 'number', min: 0, message: 'Amount cannot be negative' }
                ]}
              >
                <InputNumber
                  size="large"
                  className={styles.fullWidth}
                  placeholder="Enter payment amount (optional)"
                  precision={2}
                  min={0}
                  prefix="₹"
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="Amount Received (₹)"
                name="amountReceived"
                rules={[
                  { required: true, message: 'Please enter amount received' },
                  { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }
                ]}
              >
                <InputNumber
                  size="large"
                  className={styles.fullWidth}
                  placeholder="Enter amount received"
                  precision={2}
                  min={0.01}
                  prefix="₹"
                />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.amountReceived !== currentValues.amountReceived
                }
              >
                {({ getFieldValue }) => {
                  const amountReceived = getFieldValue('amountReceived') || 0;

                  return amountReceived > 0 ? (
                    <Card size="small" className={styles.cardPaymentSummary}>
                      <Space orientation="vertical" className={styles.fullWidth}>
                        <div className={styles.flexBetween}>
                          <span>Previous Balance:</span>
                          <span>{formatINR(selectedCustomer?.totalBalance || 0)}</span>
                        </div>
                        <div className={styles.flexBetween}>
                          <span>Amount Received:</span>
                          <strong className={`${styles.textLarge} ${styles.textSuccess}`}>
                            {formatINR(amountReceived)}
                          </strong>
                        </div>
                        <div className={`${styles.flexBetween} ${styles.dividerTop}`}>
                          <span><strong>New Balance:</strong></span>
                          <strong className={styles.textLarge} style={{ color: (selectedCustomer?.totalBalance || 0) - amountReceived > 0 ? '#ff4d4f' : '#52c41a' }}>
                            {formatINR((selectedCustomer?.totalBalance || 0) - amountReceived)}
                          </strong>
                        </div>
                      </Space>
                    </Card>
                  ) : null;
                }}
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
