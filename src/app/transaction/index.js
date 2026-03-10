'use client';

import { Form, InputNumber, Button, DatePicker, Select, Card, Table, Row, Col, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { getData, setData } from '@/utils/storage';
import { exportToExcel } from '@/utils/excelExport';

export default function Transactions() {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    setCustomers(getData('customers'));
    setTransactions(getData('transactions'));
  }, []);

  const onFinish = () => {
    const amount = values.quantity * values.rate;

    const newTxn = {
      id: Date.now().toString(),
      customerId: values.customerId,
      date: values.date.format('YYYY-MM-DD'),
      quantity: values.quantity,
      rate: values.rate,
      amount
    };

    const updated = [...transactions, newTxn];
    setTransactions(updated);
    setData('transactions', updated);
  };

  return (
    <Card title="Transaction Entry">
      <Form layout="inline" onFinish={onFinish}>
        <Form.Item name="date" initialValue={dayjs()} rules={[{ required: true }]}>
          <DatePicker />
        </Form.Item>

        <Form.Item name="customerId" rules={[{ required: true }]}>
          <Select placeholder="Customer" style={{ width: 200 }}>
            {customers.map(c => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="quantity" rules={[{ required: true }]}>
          <InputNumber placeholder="KG" />
        </Form.Item>

        <Form.Item name="rate" rules={[{ required: true }]}>
          <InputNumber placeholder="Rate" />
        </Form.Item>

        <Button type="primary" htmlType="submit">
          Save
        </Button>
      </Form>

      <Table
        style={{ marginTop: 20 }}
        rowKey="id"
        dataSource={transactions}
        title={() => (
          <Row justify="space-between" align="middle">
            <Col><strong>Transactions</strong></Col>
            <Col>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => {
                  exportToExcel(
                    transactions.map(txn => ({
                      'Date': txn.date,
                      'Customer': customers.find(c => c.id === txn.customerId)?.name,
                      'Quantity (KG)': txn.quantity,
                      'Rate': txn.rate,
                      'Amount': txn.amount,
                    })),
                    'Transactions',
                    'Transactions'
                  );
                  message.success('Transactions exported successfully!');
                }}
                disabled={transactions.length === 0}
              >
                Export
              </Button>
            </Col>
          </Row>
        )}
        columns={[
          { title: 'Date', dataIndex: 'date' },
          { title: 'Customer', render: (_, r) => customers.find(c => c.id === r.customerId)?.name },
          { title: 'KG', dataIndex: 'quantity' },
          { title: 'Rate', dataIndex: 'rate' },
          { title: 'Amount', dataIndex: 'amount' }
        ]}
      />
    </Card>
  );
}
